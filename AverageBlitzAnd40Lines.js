import chalk from 'chalk';

import fs from 'node:fs';

main()


async function main() {
    function get40lTime(record) {
        try {
            return record.records['40l'].record.endcontext.finalTime / 1000;
        } catch (err) {
            return NaN;
        }
    }

    function getBlitzScore(record) {
        try {
            return record.records.blitz.record.endcontext.score;
        } catch (err) {
            return NaN;
        }
    }

    try {
        const jsonString = await fs.promises.readFile('results.json', 'utf8');
        const data = JSON.parse(jsonString);
        const len = data.length;
        let rankSum40lTimes = {};
        let rankCount40l = {};
        let rankSumBlitzScore = {};
        let rankCountBlitz = {};

        const rdMax = 100;

        for (let i = 0; i < len; i++) {
            if (data[i].tetraStats.league.rd > rdMax) {
                continue;
            }
            let record = data[i].records;

            if (!isNaN(get40lTime(record))) {
                if (!isNaN(rankSum40lTimes[data[i].tetraStats.league.rank])) {
                    rankSum40lTimes[data[i].tetraStats.league.rank] += get40lTime(record);
                } else {
                    rankSum40lTimes[data[i].tetraStats.league.rank] = get40lTime(record);
                }
                if (!isNaN(rankCount40l[data[i].tetraStats.league.rank])) {
                    rankCount40l[data[i].tetraStats.league.rank]++;
                } else {
                    rankCount40l[data[i].tetraStats.league.rank] = 1;
                }
            }
            if (!isNaN(getBlitzScore(record))) {
                if (!isNaN(rankSumBlitzScore[data[i].tetraStats.league.rank])) {
                    rankSumBlitzScore[data[i].tetraStats.league.rank] += getBlitzScore(record);
                } else {
                    rankSumBlitzScore[data[i].tetraStats.league.rank] = getBlitzScore(record);
                }
                if (!isNaN(rankCountBlitz[data[i].tetraStats.league.rank])) {
                    rankCountBlitz[data[i].tetraStats.league.rank]++;
                } else {
                    rankCountBlitz[data[i].tetraStats.league.rank] = 1;
                }
            }
        }
        console.log()
        const fortyLinesColor = chalk.hex('FFFE33')
        const blitzColor = chalk.hex('FD5823')
        console.log('   ' + '     ' + fortyLinesColor('40 Line sprint') + ' | ' +
            blitzColor('2 Minute blitz'))
        let ranks = Object.keys(rankSum40lTimes);
        ranks.sort((a, b) => {
            return getRankNumber(a) - getRankNumber(b)
        })
        for (const rank of ranks) {
            const color = chalk.hex(getColor(rank).toString(16).padStart(6, '0'))
            console.log('   ' + color(rank.toUpperCase().padEnd(2)) + ': ' +
                chalk.yellow((rankSum40lTimes[rank] / rankCount40l[rank]).toFixed(3).padEnd(7)) +
                chalk.green(' seconds') + ' | ' +
                chalk.yellow((rankSumBlitzScore[rank] / rankCountBlitz[rank]).toFixed(3)) +
                chalk.green(' points'));
        }
    } catch (err) {
        console.error(err);
    }
}

function getRankNumber(rank) {
    switch (rank) {
        case 'd':
            return 17
        case 'd+':
            return 16
        case 'c-':
            return 15
        case 'c':
            return 14
        case 'c+':
            return 13
        case 'b-':
            return 12
        case 'b':
            return 11
        case 'b+':
            return 10
        case 'a-':
            return 9
        case 'a':
            return 8
        case 'a+':
            return 7
        case 's-':
            return 6
        case 's':
            return 5
        case 's+':
            return 4
        case 'ss':
            return 3
        case 'u':
            return 2
        case 'x':
            return 1
        case 'z':
            return 20
    }
    throw 'no such rank!'
}

function getColor(rank) {
    switch (rank) {
        case 'd':
            return 0x907591
        case 'd+':
            return 0x8E6091
        case 'c-':
            return 0x79558C
        case 'c':
            return 0x733E8F
        case 'c+':
            return 0x552883
        case 'b-':
            return 0x5650C7
        case 'b':
            return 0x4F64C9
        case 'b+':
            return 0x4F99C0
        case 'a-':
            return 0x3BB687
        case 'a':
            return 0x46AD51
        case 'a+':
            return 0x1FA834
        case 's-':
            return 0xB2972B
        case 's':
            return 0xE0A71B
        case 's+':
            return 0xD8AF0E
        case 'ss':
            return 0xDB8B1F
        case 'u':
            return 0xFF3813
        case 'x':
            return 0xFF45FF
        case 'z':
            return 0x375433
    }

    throw 'no such rank!'
}