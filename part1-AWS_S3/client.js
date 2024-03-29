const net = require("net");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();

let connectHost = undefined;
let listenPort = undefined;
if (process.argv.length !== 4) {
    connectHost = "127.0.0.1";
    listenPort = 9999;
} else {
    connectHost = process.argv[2];
    listenPort = process.argv[3];
}

const client = net.createConnection({ port: listenPort, host: connectHost });
let stdin = process.openStdin();

function isJSON(str) {
    try {
        JSON.parse(str);
    } catch (err) {
        return false;
    }
    return true;
}

client.on("data", (data) => {
    if (!isJSON(String(data))) {
        process.stdout.write(data.toString());
    } else {
        let recv = JSON.parse(data.toString());
        switch (recv["Type"]) {
            case "bucket-name": {
                let bName = recv["Name"];
                s3.createBucket({ Bucket: bName }, function (err, data) { if (err) throw err; });
            }
                break;
            case "create-post": {
                let bucket = recv["Bucket"];
                let key = recv["Key"]; // generated by title and timestamp
                let content = recv["Content"];
                let bucketContent = {
                    Content: content,
                    Comment: [],
                };
                // save to s3 bucket
                let param = { Bucket: bucket, Key: key, Body: JSON.stringify(bucketContent) };
                s3.upload(param, (err, result) => {
                    if (err) throw err;
                    else process.stdout.write("Create post successfully.\n% ");
                });
            }
                break;
            case "read": {
                let bucket = recv["Bucket"];
                let contentKey = recv["Key"];
                let author = recv["Author"];
                let title = recv["Title"];
                let date = recv["Date"];
                let postMetadata = "Author\t:" + author + "\nTitle\t:" + title + "\nDate\t:" + date + "\n--";
                s3.getObject({ Bucket: bucket, Key: contentKey }, (err, data) => {
                    if (err) throw err;
                    console.log(postMetadata);
                    // parse bucket content
                    let recvContent = JSON.parse(data.Body.toString());
                    let post = recvContent["Content"];
                    let comments = recvContent["Comment"];
                    // print post
                    console.log(post + "\n--");
                    // print comment
                    for (let comment of comments) {
                        console.log(comment["Commentator"] + ": " + comment["Comment"]);
                    }
                    process.stdout.write("% ");
                });
            }
                break;
            case "comment-post": {
                // write comments into s3 bucket
                let bucket = recv["Bucket"];
                let key = recv["Key"];
                let newComment = {
                    Commentator: recv["Commentator"],
                    Comment: recv["Comment"]
                };
                s3.getObject({ Bucket: bucket, Key: key }, (err, data) => {
                    if (err) throw err;
                    let recvContent = JSON.parse(data.Body.toString());
                    recvContent["Comment"].push(newComment);
                    // save updates to s3
                    s3.upload({ Bucket: bucket, Key: key, Body: JSON.stringify(recvContent) }, (err, result) => {
                        if (err) throw err;
                        else process.stdout.write("Comment successfully.\n% ");
                    });
                });
            }
                break;
            case "delete-post": {
                let bucket = recv["Bucket"];
                let key = recv["Key"];
                s3.deleteObject({ Bucket: bucket, Key: key }, (err, result) => {
                    if (err) throw err;
                    else process.stdout.write("Delete successfully.\n% ");
                });
            }
                break;
            case "update-post": {
                let bucket = recv["Bucket"];
                let key = recv["Key"];
                let content = recv["Content"];
                // content object in s3 includes comments, need to pull and push
                s3.getObject({ Bucket: bucket, Key: key }, (err, data) => {
                    if (err) throw err;
                    let recvContent = JSON.parse(data.Body.toString());
                    // update post content
                    recvContent["Content"] = content;
                    s3.upload({ Bucket: bucket, Key: key, Body: JSON.stringify(recvContent) }, (err, result) => {
                        if (err) throw err;
                        else process.stdout.write("Update successfully.\n% ");
                    });
                });
            }
                break;
            case "mail-to": {
                let bucket = recv["Bucket"];
                let key = recv["Key"];
                let content = recv["Content"];
                s3.upload({ Bucket: bucket, Key: key, Body: content }, (err, result) => {
                    if (err) throw err;
                    else process.stdout.write("Sent successfully.\n% ");
                });
            }
                break;
            case "retr-mail": {
                let bucket = recv["Bucket"];
                let key = recv["Key"];
                let subject = recv["Subject"];
                let from = recv["From"];
                let date = recv["Date"];
                s3.getObject({ Bucket: bucket, Key: key }, (err, data) => {
                    if (err) throw err;
                    let mailContent = data.Body.toString();
                    let metadata = "Subject\t:" + subject + "\nFrom\t:" + from + "\nDate\t:" + date + "\n--";
                    console.log(metadata);
                    console.log(mailContent);
                    process.stdout.write("% ");
                });
            }
                break;
            case "delete-mail": {
                let bucket = recv["Bucket"];
                let key = recv["Key"];
                s3.deleteObject({ Bucket: bucket, Key: key }, (err, result) => {
                    if (err) throw err;
                    else process.stdout.write("Mail deleted.\n% ");
                });
            }
                break;
            default:
                break;
        }
    }
});

stdin.addListener("data", (input) => {
    let send = String(input).replace(/\r|\n|\t/g, " ").split(" ").filter((value, index, arr) => { if (value != "") return value });
    if (send.length > 0 && send[0] === "exit") {
        process.exit();
    } else {
        client.write(input.toString());
    }
});