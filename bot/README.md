# Developer Documentation

## setup
1. install globally node-ts `npm install -g node-ts` 
2. npm install in bot directory
3. run postgresql database in docker with 
`docker run --name my-postgres-container -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres

## run
run `npm run start-dev` in bot directory

## modifying the database
### from data structure to db schema
run `npx prisma db push`  to set the db schema as defined in schema.prisma
### from db schema to data structure
run `npx prisma db pull` to generate the data structures from the db schema

## environment variables
when modifying the contend of the .env file by adding new variables, we also need to add those variables to the environment.d.ts file to specify the type of the variable