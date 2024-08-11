// Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyDP-JXtqfJ_7KEi-R_IOe_o1__WqcS38LY",
    authDomain: "olympicdraft-3330e.firebaseapp.com",
    projectId: "olympicdraft-3330e",
    storageBucket: "olympicdraft-3330e.appspot.com",
    messagingSenderId: "527171908375",
    appId: "1:527171908375:web:a4138b711ae0446020fd52"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

document.getElementById('update-button').addEventListener('click', async () => {
    try {
        console.log("Update button clicked. Starting update process...");

        // Update status
        const statusElement = document.getElementById('update-status');
        statusElement.textContent = "Updating...";

        // Fetch the Wikipedia page through the proxy
        console.log("Fetching data from Wikipedia...");
        // Cache busting parameter
        const cacheBuster = new Date().getTime();

        // Fetch the Wikipedia page through the proxy with cache busting
        const response = await fetch(`https://corsproxy.io/?https://en.wikipedia.org/wiki/2024_Summer_Olympics_medal_table?_=${cacheBuster}`);

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        console.log("Data fetched successfully.");

        // Extract the table content
        const table = doc.querySelector('.wikitable.sortable.plainrowheaders.jquery-tablesorter');
        const rows = table.querySelectorAll('tbody tr');
        console.log(`Found ${rows.length} rows in the table.`);

        let promises = [];
        rows.forEach((row, index) => {
            // Skip the first and last rows
            if (index === 0 || index === rows.length - 1) {
                console.log(`Skipping row ${index === 0 ? 'header' : 'totals'} row.`);
                return;
            }

            const cells = row.querySelectorAll('th, td');
            if (cells.length >= 5) {
                const countryNameCell = cells[cells.length >= 6 ? 1 : 0];
                const countryNameElement = countryNameCell.querySelector('a') || countryNameCell;
                const countryName = countryNameElement.innerText.trim();
                const gold = parseInt(cells[cells.length >= 6 ? 2 : 1].innerText.trim(), 10) || 0;
                const silver = parseInt(cells[cells.length >= 6 ? 3 : 2].innerText.trim(), 10) || 0;
                const bronze = parseInt(cells[cells.length >= 6 ? 4 : 3].innerText.trim(), 10) || 0;

                console.log(`Processing country: ${countryName}, Gold: ${gold}, Silver: ${silver}, Bronze: ${bronze}`);

                // Calculate points
                const points = calculatePoints(countryName, gold, silver, bronze);
                console.log(`Calculated points for ${countryName}: ${points}`);

                // Only add valid rows with a country name
                if (countryName) {
                    const countryData = {
                        country: countryName,
                        gold: gold,
                        silver: silver,
                        bronze: bronze,
                        points: points,
                        timestamp: new Date()
                    };

                    // Save each country as a separate entry in Firestore
                    const promise = db.collection("medalTables").doc(countryName).set(countryData)
                        .then(() => {
                            console.log(`Successfully wrote document for ${countryName}`);
                        })
                        .catch(error => {
                            console.error(`Error writing document for ${countryName}: `, error);
                        });
                    promises.push(promise);
                } else {
                    console.warn(`Skipping row with missing country name:`, row);
                }
            } else {
                console.warn(`Skipping row with insufficient cells:`, row);
            }
        });

        // Wait for all promises to resolve
        await Promise.all(promises);
        console.log("All promises resolved.");

        // Update status
        statusElement.textContent = "Update successful!";
        console.log("Update process completed successfully.");
    } catch (error) {
        console.error("Error updating data: ", error);
        document.getElementById('update-status').textContent = "Update failed!";
    }
});

document.getElementById('update-leaderboard-button').addEventListener('click', async () => {
    try {
        console.log("Update leaderboard button clicked. Starting update process...");

        const statusElement = document.getElementById('update-status');
        statusElement.textContent = "Updating leaderboard...";

        // Get all players
        const playersSnapshot = await db.collection("players").get();
        const players = [];
        playersSnapshot.forEach(doc => {
            players.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Found ${players.length} players.`);

        // Get all countries from medalTables
        const countriesSnapshot = await db.collection("medalTables").get();
        const countries = {};
        countriesSnapshot.forEach(doc => {
            countries[doc.id] = doc.data().points;
        });

        console.log(`Found ${Object.keys(countries).length} countries in medalTables.`);

        let leaderboardPromises = [];
        players.forEach(player => {
            let totalPoints = 0;
            player.selectedCountries.forEach(country => {
                if (countries[country]) {
                    totalPoints += countries[country];
                }
            });

            console.log(`Updating points for player ${player.playerName}: ${totalPoints} points`);

            const promise = db.collection("players").doc(player.id).update({ points: totalPoints })
                .then(() => {
                    console.log(`Successfully updated points for player ${player.playerName}`);
                })
                .catch(error => {
                    console.error(`Error updating points for player ${player.playerName}: `, error);
                });
            leaderboardPromises.push(promise);
        });

        await Promise.all(leaderboardPromises);
        console.log("All leaderboard promises resolved.");

        // Update status
        statusElement.textContent = "Leaderboard update successful!";
        console.log("Leaderboard update process completed successfully.");
    } catch (error) {
        console.error("Error updating leaderboard: ", error);
        document.getElementById('update-status').textContent = "Leaderboard update failed!";
    }
});

// Function to calculate points with special rules for "United States", "China", and "France"
function calculatePoints(country, gold, silver, bronze) {
    if (country === "United States") {
        return gold * 30;
    } else if (country === "China") {
        return (gold + silver + bronze) * 10;
    } else if (country === "France") {
        return (gold + silver + bronze) * 20;
    }
    return (gold * 30) + (silver * 20) + (bronze * 10);
}
