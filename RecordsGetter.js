import chalk from 'chalk';

import fs from 'node:fs';

main();

let session = (new Date() / 1000) + "_AVG_FORTY_LINES_PER_RANK";
let options = {
    headers: {
        'X-Session-ID': session,
    }
};

async function main() {

    let i;
    console.log(process.cwd());
    let maxTr = 25000;
    const saveFrequency = 100;
    let recordUserArray = [];
    let usersAlreadyDone = [];


    if (await yesOrNo("use previous data? (y/n)")) {

        try {
            const jsonString = await fs.promises.readFile('metaResults.json', 'utf8');
            const metaResults = JSON.parse(jsonString);
            maxTr = metaResults.maxTr;

            const oldDataList = await readResults();
            for (const element of oldDataList) {
                usersAlreadyDone.push(element.tetraStats.username);
                recordUserArray.push(element);
            }
        } catch (err) {
            console.log('Error reading file:', err);
        }
    }

    let maxUsersPerRank = await numberInput("Enter the maximum number of users per rank (distributed randomly, put 999999999 for all the users): ");
    async function readResults() {
        try {
            const jsonString = await fs.promises.readFile('resultsUnfinished.json', 'utf8');
            const oldDataList = JSON.parse(jsonString);
            return oldDataList;
        } catch (err) {
            console.error(err);
            return [];
        }
    }


    function saveDataMidway(recordUserArray) {
        fs.writeFile('resultsUnfinished.json', JSON.stringify(recordUserArray), (error) => {
            if (error) {
                console.error(error);
            } else {
                console.log(chalk.greenBright("Results saved to file."));
            }
        });
        fs.writeFile('metaResults.json', JSON.stringify({maxTr: maxTr, index: i}), (error) => {
            if (error) {
                console.error(error);
            } else {
            }
        });
    }
    let rank_arrays = {};
    try {
        console.log("getting users...");
        let users = await getUsers();
        const len = users.length;
        for (i = 0; i < len; i++) {

            if (!(users[i].league.rank in rank_arrays)) {
                rank_arrays[users[i].league.rank] = [];
            }

            if (usersAlreadyDone.includes(users[i].username)) {
                continue;
            }
            rank_arrays[users[i].league.rank].push(users[i]);


        }
        for (let rank in rank_arrays) {
            let arr = rank_arrays[rank]
            // console.log(arr);

            // Shuffle array
            const shuffled = arr.sort(() => 0.5 - Math.random());

        // Get sub-array of first n elements after shuffled
            let selected = shuffled.slice(0, maxUsersPerRank);
            let i = 0;
            for (let user of selected) {
                await addUserRecords(user);
                i++;
                if (i%saveFrequency == 0) {
                    saveDataMidway(recordUserArray);
                }
            }
        }
        fs.writeFile('results.json', JSON.stringify(recordUserArray), (error) => {
            if (error) {
                console.error(error);
            } else {
                console.log("Results saved to file.");
            }
        });
    } catch (error) {
        console.error(error);
    }

    async function addUserRecords(user) {
        console.log(`${chalk.blueBright(user.username)}: ${chalk.yellow(`${user.league.tr} TR`)}, ` +
            `${chalk.red(`${user.league.rank.toUpperCase()}`)}\x1b[0m`);
        maxTr = user.league.rating;

        let getRecordPromise = new Promise(resolve => {
            getUserRecords(user.username).then(records => {
                recordUserArray.push({tetraStats: user, records: records})
                resolve();
            })
        })

        //wait for user input or 1 second whichever comes first
        const timerPromise = new Promise(resolve => setTimeout(resolve, 1000));
        let stopRequested = false;
        const userInputPromise = new Promise(resolve => {
            process.stdin.once('data', () => {
                stopRequested = true;
                resolve();
            });
        });

        await Promise.race([Promise.all([timerPromise, getRecordPromise]), userInputPromise]);

        if (stopRequested) {
            console.log("User has requested to stop.");

            saveDataMidway(recordUserArray);

            return;
        }

        usersAlreadyDone.push(user.username);
    }

}

async function yesOrNo(question) {
    let input;

    console.log(question)
    const userInputPromise = new Promise(resolve => {
        process.stdin.once('data', data => {
            input = data.toString().trim(); // get the user input and remove trailing whitespace
            resolve(input); // resolve the promise with the user input
        });
    });

    await userInputPromise;

    return input.startsWith("y");
}

async function numberInput(question) {
    let input;

    console.log(question);
    const userInputPromise = new Promise(resolve => {
        process.stdin.once('data', data => {
            input = parseFloat(data.toString().trim()); // parse the user input as a number
            resolve(input); // resolve the promise with the user input
        });
    });

    await userInputPromise;

    // Return true if the number is greater than or equal to the threshold
    return input;
}


async function getUsersInRange(limit, after) {
    let url = `https://ch.tetr.io/api/users/lists/league?limit=${limit}&after=${after}`;
    let response = await fetch(url, options);
    let data = await response.json();
    return data.data.users;
}

async function getUsers() {

    let url = "https://ch.tetr.io/api/users/by/league";
    // im not sure if this is how x session headers work

    let res = [];
    let curr_url = url + "?limit=100";
    let response = await fetch(curr_url, options);
    if (response.ok) {
        let data = await response.json();
        res = res.concat(data.data.entries);
    } else {
        console.log("HTTP-Error: " + response.status);
    }
    await sleep(1000);

    while (true) {

        let after_parm = "?after="  + res[res.length - 1].p.pri + ":" + res[res.length - 1].p.sec + ":" + res[res.length - 1].p.ter;
        let curr_url = url + after_parm + "&limit=100"  ;
        let response = await fetch(curr_url, options);
        if (response.ok) {
            let data = await response.json();
            if (data.data.entries.length == 0) {
                break;
            }
            res = res.concat(data.data.entries);
        } else {
            console.log("HTTP-Error: " + response.status);
        }
        console.log(chalk.green(res.length) + " users fetched.")
        await sleep(1000);
    }
    return res;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getUserRecords(name) {
    let fortyLinesResponse = await fetch(`https://ch.tetr.io/api/users/${name}/records/40l/top`, options);
    let fortyData = await fortyLinesResponse.json();
    await sleep(1000);
    let blitzResponse = await fetch(`https://ch.tetr.io/api/users/${name}/records/blitz/top`, options);
    let blitzData = await blitzResponse.json();
    await sleep(1000);

    return {"40l": fortyData.data.entries[0], "blitz": blitzData.data.entries[0]};
}