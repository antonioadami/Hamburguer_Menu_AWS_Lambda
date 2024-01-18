import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Client } from 'pg';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let statusCode = 200;
    let body = '';

    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT as string),
    });

    try {
        await client.connect();

        const query = await client.query(`SELECT * FROM INGREDIENTS;`);
        const data = query.rows.map((row) => ({
            type: 'ingredients',
            id: row.id,
            attributes: Object.fromEntries(Object.entries(row).filter(([key, value]) => key !== 'id')),
        }));

        body = JSON.stringify({
            data,
        });
    } catch (err) {
        statusCode = 500;
        body = JSON.stringify({
            message: 'some error happened',
        });
    } finally {
        await client.end();
        return {
            statusCode,
            body,
        };
    }
};
