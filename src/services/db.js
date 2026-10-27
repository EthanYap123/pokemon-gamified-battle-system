require('dotenv').config({ quiet: true }); //read .env file and set environment variables

const { Pool, types } = require('pg');

// Return COUNT/SUM results as numbers and dates as plain strings
types.setTypeParser(20, Number);           // bigint (COUNT)
types.setTypeParser(1700, Number);         // numeric (SUM)
types.setTypeParser(1082, value => value); // date
types.setTypeParser(1114, value => value); // timestamp

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL, //Neon gives one URL with host, user, password, database and sslmode
    max: Number(process.env.DB_POOL_MAX) || 5 //serverless functions only need a few connections each
});

// The models are written with ? placeholders (pool.query(sql, values, callback)).
// toPg turns them into Postgres $1, $2... An array value becomes a list, so
// "IN (?)" with [1, 2] works, and an array of arrays becomes rows for "VALUES ?".
function toPg(sql, values = []) {
    const params = [];
    const placeholder = value => {
        params.push(value);
        return `$${params.length}`;
    };
    let i = 0;
    const text = sql.replace(/\?/g, () => {
        const value = values[i++];
        if (!Array.isArray(value)) return placeholder(value);
        if (value.length > 0 && Array.isArray(value[0])) {
            return value.map(row => `(${row.map(placeholder).join(', ')})`).join(', ');
        }
        return value.map(placeholder).join(', ');
    });
    return { text, params };
}

// SELECT gives the rows. INSERT/UPDATE/DELETE give { affectedRows, insertId },
// where insertId is the first column of RETURNING (if the statement has one).
function shape(result) {
    if (Array.isArray(result)) result = result[result.length - 1]; //several statements: keep the last
    if (result.command === 'SELECT') return result.rows;
    const first = result.rows && result.rows[0];
    return {
        affectedRows: result.rowCount,
        insertId: first ? Object.values(first)[0] : undefined,
        rows: result.rows
    };
}

async function run(client, sql, values) {
    // Statements without values go through as-is, so a script can hold several
    if (!values || values.length === 0) return shape(await client.query(sql));
    const { text, params } = toPg(sql, values);
    return shape(await client.query(text, params));
}

// Callback style, as used by most models: pool.query(sql, [values], callback)
function query(sql, values, callback) {
    if (typeof values === 'function') {
        callback = values;
        values = [];
    }
    const promise = run(pgPool, sql, values);
    if (!callback) return promise;
    promise.then(results => callback(null, results), error => callback(error));
}

// Promise style: const [rows] = await pool.promise().query(sql, values)
const promisePool = {
    query: async (sql, values) => [await run(pgPool, sql, values)],

    // One connection for a transaction (see shopController.withTransaction)
    getConnection: async () => {
        const client = await pgPool.connect();
        return {
            query: async (sql, values) => [await run(client, sql, values)],
            beginTransaction: () => client.query('BEGIN'),
            commit: () => client.query('COMMIT'),
            rollback: () => client.query('ROLLBACK'),
            release: () => client.release()
        };
    }
};

module.exports = {
    query,
    promise: () => promisePool,
    end: () => pgPool.end()
};
