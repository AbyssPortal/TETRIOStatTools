import chalk from 'chalk';

import fs from 'node:fs';

main();


async function main() {

    let i;
    console.log(process.cwd());
    let maxTr=25000;
    const saveFrequency = 100;
    let recordUserArray = [];
    let usersAlreadyDone = [];

    let input;

    console.log('Do you want to use unfinished data? (y/n)')
    const userInputPromise = new Promise(resolve => {
        process.stdin.once('data', data => {
            input = data.toString().trim(); // get the user input and remove trailing whitespace
            resolve(input); // resolve the promise with the user input
        });
    });

    await userInputPromise

    if (input === 'y') {

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

    try {
        console.log("getting users...");
        let users = await getUsers();
        const len = users.length;
        for (i = 0; i < len; i++) {
            console.log(`${chalk.blueBright(users[i].username)}: ${chalk.yellow(`${users[i].league.rating} TR`)}, ` +
             `${chalk.red(`${users[i].league.rank.toUpperCase()}`)}\x1b[0m`);
            maxTr = users[i].league.rating;
            if (usersAlreadyDone.includes(users[i].username)) {
                continue;
            }
            else {
                usersAlreadyDone.push(users[i].username);
            }
            let records = await getUserRecords(users[i].username)
            recordUserArray.push({tetraStats:users[i], records: records});
            //wait for user input or 1 second whichever comes first
            const timerPromise = new Promise(resolve => setTimeout(resolve, 1000));
            let stopRequested = false;
            const userInputPromise = new Promise(resolve => {
                process.stdin.once('data', () => {
                    stopRequested = true;
                    resolve();
                });
            });

            await Promise.race([timerPromise, userInputPromise]);

            if(stopRequested) {
                console.log("User has requested to stop.");

                saveDataMidway(recordUserArray);

                return;
            }


            if (i%saveFrequency === 0 && i !== 0) {
                saveDataMidway(recordUserArray);
            }
        }
        fs.writeFile('results.json', JSON.stringify(recordUserArray), (error) => {
            if (error) {
                console.error(error);
            } else {
                console.log("Results saved to file.");
            }
        });
    }
    catch (error) {
        console.error(error);
    }


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