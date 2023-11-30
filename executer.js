import axios from 'axios';

async function execute(url, oauth2Client) {
    try {
        const queryURL = new urlparse(url);
        const code = queryParse.parse(queryURL.query).code;

        const tokens = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens.tokens);

        const gmail = await google.gmail({ version: 'v1', auth: oauth2Client });

        try {
            const labels = await getlabels(tokens.tokens.access_token);
            // console.log(labels);

            const customLabel = 'AUTO-REPLIED MAILS';
            let customLabelid = null;

            const labelNames = labels.map((ele) => ele.name);

            if (!labelNames.includes(customLabel)) {
                const response = await createLabel(tokens.tokens.access_token, customLabel);
                customLabelid = response.id;
            } else {
                for (let i = 0; i < labels.length; i++) {
                    if (labels[i].name == customLabel) {
                        customLabelid = labels[i].id;
                        break;
                    }
                }
            }

            const msgs = await getUnreadmsgs(tokens.tokens.access_token);
            console.log(msgs);

            if (msgs) {
                msgs.forEach(async (element) => {
                    let msgids = [];
                    if (element.id == element.threadId) {
                        msgids.push(element.id);

                        const msgDetails = await getMsgDetails(tokens.tokens.access_token, element.id);

                        let sender, recipient, subject;

                        (msgDetails.payload.headers).forEach(async element => {
                            if (element.name == 'From') {
                                sender = element.value.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)[0];
                            }

                            if (element.name == 'To') {
                                recipient = element.value.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)[0];
                            }

                            if (element.name == 'Subject') {
                                subject = element.value;
                            }
                        });

                        console.log(`Sender: ${sender}, Recipient: ${recipient}, Subject: ${subject}\n\n`);

                        sendEmail(sender, recipient, subject, "Replied", element.id, element.threadId, gmail);
                    }
                });

                const response = await transferLabel(tokens.tokens.access_token, msgids, [customLabelid]);
                console.log(response);


                // const userDetails = await gmail.users.getProfile('me');

                const userDetails = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
                    headers: {
                        authorization: "Bearer " + tokens.tokens.access_token
                    }
                });


                console.log(userDetails.data);
            }
        } catch (error) {

        }
    }