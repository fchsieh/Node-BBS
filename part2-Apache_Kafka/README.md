# Node BBS Server-Client system with Apache Kafka

- Users subscribed to a specific board will receive a notification from Apache Kafka

## Dependencies

- Nodejs
- mongoDB
- Apache Kafka
- npm packages

```shell
npm install mongoose
npm install mongoose-sequence
npm install kafka-node
```

## Usage

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
