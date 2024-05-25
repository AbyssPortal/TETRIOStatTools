import chalk from 'chalk';

import fs from 'node:fs';

main();


async function main() {

    let i;
    console.log(process.cwd());
    let maxTr = 25000;
    const saveFrequency = 100;
    let recordUserArray = [];
    let usersAlreadyDone = [];
    let maxUsersPerRank = 200;


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
        console.log(`${chalk.blueBright(user.username)}: ${chalk.yellow(`${user.league.rating} TR`)}, ` +
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
async function getUsersInRange(limit, after) {
    let url = `https://ch.tetr.io/api/users/lists/league?limit=${limit}&after=${after}`;
    let response = await fetch(url);
    let data = await response.json();
    return data.data.users;
}

async function getUsers() {
    let url = `https://ch.tetr.io/api/users/lists/league/all`;
    let response = await fetch(url);
    let data = await response.json();
    return data.data.users;
}

async function getUserRecords(name) {
    let response = await fetch(`https://ch.tetr.io/api/users/${name}/records`);
    let data = await response.json();
    return data.data;
}