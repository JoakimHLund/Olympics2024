// Your web app's Firebase configuration
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

// Function to get flag emoji
function getFlagEmoji(code) {
    return `https://unpkg.com/flag-icons@6.6.6/flags/4x3/${code}.svg`;
}

// Fetch the countries data from JSON
fetch('countries.json')
    .then(response => response.json())
    .then(countriesData => {
        // Fetch data from Firestore for each country
        const promises = countriesData.map(country => {
            return db.collection("medalTables").doc(country.NOC).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    return {
                        ...country,
                        gold: data.gold,
                        silver: data.silver,
                        bronze: data.bronze,
                        points: data.points
                    };
                } else {
                    return country;
                }
            });
        });

        Promise.all(promises).then(countries => {
            // Sort countries by Points/Cost
            countries.sort((a, b) => {
                const pointsA = a.points || 0;
                const pointsB = b.points || 0;
                const costA = a.Draft || 1;
                const costB = b.Draft || 1;
                return (pointsB / costB) - (pointsA / costA);
            });

            const tbody = document.getElementById('country-stats');
            countries.forEach(country => {
                const points = country.points || 0;
                const draftCost = country.Draft || 1;
                const pointsPerCost = (points / draftCost).toFixed(2);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <img src="${getFlagEmoji(country.Code)}" alt="${country.NOC}" class="flag" onerror="this.src='img/olympicflag.png'"> 
                        ${country.NOC}
                    </td>
                    <td>${country.Draft}</td>
                    <td>${country.gold || 0}</td>
                    <td>${country.silver || 0}</td>
                    <td>${country.bronze || 0}</td>
                    <td>${points}</td>
                    <td>${pointsPerCost}</td>
                `;
                tbody.appendChild(row);
            });
        });
    })
    .catch(error => console.error('Error fetching countries data:', error));
