const User = require("./db.js").User;

function argumentParser(socket, cmd, data, position, usage) {
    // split raw input into tokens
    let splittedInput = String(data).replace(/\r|\n|\t/g, " ").split(" ").filter((value, index, arr) => {
        if (value != "")
            return value
    });
    // should include all of the positional parameters
    for (let p of position) {
        if (!splittedInput.includes(p)) {
            socket.write(usage);
            return;
        }
    }
    // each positionnal parameters should only appear once
    let appear = [];
    for (let p of position) {
        let count = 0;
        for (let i = 0; i < splittedInput.length; i++) {
            if (splittedInput[i] === p) {
                count++;
                if (count > 1) {
                    socket.write(usage);
                    return;
                } else {
                    appear.push(i);
                }
            }
        }
    }
    // positinal parameters should be held in order
    if (appear.length > 1) {
        for (let i = 1; i < appear.length; i++) {
            if (appear[i] < appear[i - 1]) {
                socket.write(usage);
                return;
            }
        }
    }
    // separate command
    let parsedCommand = [];
    let command = String(data).substring(cmd.length).replace(/\r/g, "").replace(/^\s+/, "");
    // split by first position arg
    let firstSplit = command.split(position[0]);
    if (position.length > 1) {
        parsedCommand.push(firstSplit[0].trim());
        let secondSplit = firstSplit[1].split(position[1]);
        for (let s of secondSplit) {
            // remove leading space of separated strings
            s = s.replace(/^\s+/, "").trim().replace(/<br>/g, "\n");
            parsedCommand.push(s);
        }
    } else {
        for (let c of firstSplit) {
            parsedCommand.push(c.trim().replace(/<br>/g, "\n"));
        }
    }

    // final check, first element(for query) should not be empty
    if (parsedCommand == null || parsedCommand.length === 0 || (parsedCommand.length > 1 && parsedCommand[0] === "")) {
        socket.write(usage);
        return;
    }
    return parsedCommand;
}

module.exports = {
    mail_to: function (socket, recv, data) {
        if (!socket.Session.login) {
            socket.write("Please login first.\n% ");
            return;
        } else {
            let usage = "Usage: mail-to <username> --subject <subject> --content <content>\n% ";
            let parsedInput = argumentParser(socket, recv[0], data, ["--subject", "--content"], usage);
            if (parsedInput == null) return;

            let sender = socket.Session.name;
            let recipient = parsedInput[0];
            let subject = parsedInput[1];
            let key = ("mail-" + subject.replace(/\s+/g, "-")) + "-" + Date.now();
            let content = parsedInput[2];

            // find recipient and save metadat to the user
            User.findOne({ Username: recipient }, (err, user) => {
                if (err) throw err;
                if (user == null) {
                    socket.write(recipient + " does not exist.\n% ");
                    return;
                } else {
                    // mailid = last element's mailid + 1
                    let mailID = user["Mail"].length === 0 ? 1 : user["Mail"][user["Mail"].length - 1]["MailID"] + 1;
                    let newMail = {
                        "From": sender,
                        "Subject": subject,
                        "Date": new Date(),
                        "Key": key,
                        "MailID": mailID,
                    };
                    User.updateOne({ Username: recipient }, { "$push": { "Mail": newMail } }, (err, success) => {
                        if (err) throw err;
                        if (success) {
                            // let client upload content to recipient's bucket
                            let s3settings = {
                                Type: "mail-to",
                                Bucket: user["Bucket"],
                                Key: key,
                                Content: content,
                            };
                            socket.write(JSON.stringify(s3settings));
                        }
                        else console.error("Mail-to failed. check mongodb:");
                        return;
                    });
                }
            });
        }
        return;
    },

    list_mail: function (socket) {
        if (!socket.Session.login) {
            socket.write("Please login first.\n% ");
            return;
        } else {
            let user = socket.Session.name;
            User.findOne({ Username: user }, (err, user) => {
                if (err) throw err;
                if (user == null) socket.write("Please login first.\n% ");
                else {
                    socket.write("ID\tSubject\tFrom\tDate\n");
                    for (let mail of user["Mail"]) {
                        let date = mail["Date"];
                        let month = (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1);
                        let day = (date.getDate() < 10 ? '0' : '') + date.getDate();
                        socket.write(mail["MailID"] + "\t" + mail["Subject"] + "\t" + mail["From"] + "\t" + month + "/" + day + "\n");
                    }
                    socket.write("% ");
                    return;
                }
            });
        }
    },
    // TODO: retr-mail
    // TODO: delete-mail
};