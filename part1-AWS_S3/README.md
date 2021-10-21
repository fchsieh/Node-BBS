# Node BBS Server-Client system with AWS S3

- Each user can send emails to others
- Posts will be saved in AWS S3 bucket and will automatically update or delete

## Dependencies

- Nodejs
- mongoDB
- AWS S3 account
- npm packages

```shell
npm install mongoose
npm install mongoose-sequence
npm install aws-sdk
```

## Usage

0. Create AWS API access key (Check `Requirements.pdf`)

1. Start mongoDB

```shell
mongod
```

2. Start server

```shell
node ./server.js <port>
```

3. Run client

```shell
node ./client.js <port>
```

4. Check "Requirements.pdf" for detail
