const fs = require('node:fs');

const CSV_FILE_PATH = 'C:\\Users\\flemnitzer\\Downloads\\jira-process-ores.csv'
const STD_JQL =`project = PIA AND issuetype = "Inet Develop Task" AND status = Closed AND status was "Chosen for ToDo" during ("2023/02/01", "2024/02/01") ORDER BY updated ASC`
let main = async () => {
    fs.writeFile(CSV_FILE_PATH, 'Key, timeStamp, newStatus, timeSpent\n', err => {if (err) throw err});
    let start = new Date(); // festhalten des Zeitpunkts um loggen zu können, wie lange das fetchen dauert
    let j = 0;
    let n;
    do {
        const response = await fetch(`https://(entfernt).de/rest/api/2/search?jql=${STD_JQL}&expand=changelog&maxResults=1000&fields=""&startAt=${j*1000}`, {
            method: "GET",
            headers: {"Authorization":"Basic (entfernt)"},
        });
        console.log("Fetch complete")
        const data = await response.json();
        n = Math.floor(data.total/1000);
        data.issues.forEach(issue => writeToCSV(preprocessTicket(issue)))
    } while (j++<n)
    console.log("Ergebnisse geladen");
    let end = new Date();
    let timeNeeded = (end-start)/(1000);// Auswerten, wie viel Zeit benötigt wurde
    console.log(`Erstellen der Prozess-Erze abgeschlossen in ${timeNeeded} Sekunden`);
}

let preprocessTicket = ({key, changelog: {histories}}) => {
    console.log(key);
    return preprocessHistories(histories).map(history => ({key, ...history}))
}

let preprocessHistories = histories => {
    histories = histories.map(({created, items}) => ({created: new Date(created).toISOString(), newStatus: extractNewStatus(items), timeSpent: extractTimeSpent(items)}))
    let timeKonto = 0
    histories.forEach((history) => {
        if (history.timeSpent) {
            timeKonto += history.timeSpent
            history.timeSpent = undefined
        }
        if (history.newStatus) {
            history.timeSpent = timeKonto
            timeKonto = 0
        }
    })
    return histories.filter(({newStatus}) => !!newStatus)
}

let extractNewStatus = items => {
    return items.find(({field}) => field === 'status')?.toString
}

let extractTimeSpent = items => {
    let theItem = items.find(({field}) => field === 'timespent')
    if (!theItem) return undefined
    return theItem.to - theItem.from
}

let writeToCSV = logArray => {
    fs.writeFile(CSV_FILE_PATH, createCSVString(logArray), { flag: 'a' }, err => {if (err) throw err});
}

let createCSVString = logArray => {
    let s = ''
    logArray.forEach(log => s+=Object.values(log).join(",")+"\n")
    return s
}

main().catch(e => console.error(e))

