# Developer Documentation

## setup
1. install globally node-ts `npm install -g node-ts` 
2. npm install in bot directory
3. run postgresql database in docker with 
`docker run --name my-postgres-container -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres`

## run
run `npm run start-dev` in bot directory

## modifying the database
### from data structure to db schema
run `npx prisma db push`  to set the db schema as defined in schema.prisma
### from db schema to data structure
run `npx prisma db pull` to generate the data structures from the db schema

## to connect to the containerized database
- run `docker ps -a`
- look for the postgre containerid
- connect into the container with `docker exec -it <containerid> /bin/bash`
- get into the psql terminal with the postgres role: `psql -U postgres`
- useful commands:
    - `\du` lisits all users
    - `\l` lists all databases
    - `\c <database name>` connects you into the chosen db (connect to postgres db with `\c postgres`)
    - `\dt` lists all tables in the db
    - ```sql
        -- prints the content of the table and so on: remember to end SQL statements with **;**
        SELECT * FROM "<tablename>";
        ```
    - ```sql
        -- Useful commands to update the available ups of a user in a group
        UPDATE "user_in_group" SET "up_available" = 0 WHERE "userid" = <id of the user>;
        ```

## environment variables
when modifying the contend of the .env file by adding new variables, we also need to add those variables to the environment.d.ts file to specify the type of the variable

## database migration
put in the same folder the dump of the old db called `dump.sql` and the extract_groups.py script and run from the terminal the command `python3 extract_groups.py`
for some reason somemtimes in the dump values that should be represented by the empty string are instead represented by NULL, for the script to work properly is necessary to replace the NULL values with the empty string in the dump file, this can be done by searching for the regex `, NULL` and replacing it with `, ''` in the dump file. 
to do so with vscode use the regex search and replace option before running the script.