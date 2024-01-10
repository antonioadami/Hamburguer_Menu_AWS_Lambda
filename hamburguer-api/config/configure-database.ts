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
        user: 'postgres',
        host: '',
        database: 'hamburguers',
        password: '',
        port: 5432,
    });

    try {
        await client.connect();

        await client.query(`
            CREATE TABLE hamburguers(
                id SERIAL not null,
                name VARCHAR(25) not null,
                price float not null,
                primary key(id)
            );`);

        await client.query(`
            CREATE TABLE ingredients(
                id SERIAL not null,
                name VARCHAR(25) not null,
                unit varchar(10),
                amount float default 0,
                primary key(id)
            );`);

        await client.query(`
            create table hamburguer_ingredient (
                hamburguer_id int not null,
                ingredient_id int not null,
                CONSTRAINT ingredient_fk foreign key (ingredient_id) references ingredients(id),
                CONSTRAINT hamburguer_fk foreign key (hamburguer_id) references hamburguers(id),
                CONSTRAINT hamburguer_ingredient_unique UNIQUE (hamburguer_id, ingredient_id)
            )`);

        body = JSON.stringify({
            message: 'Database configured',
        });
    } catch (err) {
        console.log(err);
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
