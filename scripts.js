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

let totalPoints = 10;
let usedPoints = 0;

function updatePointsIndicator() {
    document.getElementById('points-indicator').textContent = `${totalPoints - usedPoints}/10 Draft tokens 🔵 left`;
}

function updateSelectedFlags() {
    const selectedFlagsContainer = document.getElementById('selected-flags');
    selectedFlagsContainer.innerHTML = ''; // Clear existing flags
    const selectedFlags = document.querySelectorAll('.card.selected img.flag, .featured-card.selected img.flag');
    selectedFlags.forEach(flag => {
        const smallFlag = document.createElement('img');
        smallFlag.src = flag.src;
        selectedFlagsContainer.appendChild(smallFlag);
    });
    toggleSubmitButton();
}

function updateCardStates() {
    const cards = document.querySelectorAll('.card, .featured-card');
    cards.forEach(card => {
        const points = parseInt(card.dataset.points);
        if (usedPoints + points > totalPoints && !card.classList.contains('selected')) {
            card.classList.add('unaffordable');
        } else {
            card.classList.remove('unaffordable');
        }
    });
}

function handleFlagError(event) {
    event.target.src = 'img/olympicflag.png';
}

function createFeaturedCard(countryName, countryCode, points, additionalText) {
    const card = document.createElement('div');
    card.className = 'featured-card';
    card.dataset.points = points;

    card.innerHTML = `
        <img src="https://unpkg.com/flag-icons@6.6.6/flags/4x3/${countryCode}.svg" class="flag" onerror="handleFlagError(event)">
        <h2>${countryName}</h2>
        <p>Cost: ${points} 🔵</p>
        <div class="additional-info">${additionalText}</div>
    `;

    card.addEventListener('click', () => {
        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            usedPoints -= points;
        } else if (!card.classList.contains('unaffordable')) {
            card.classList.add('selected');
            usedPoints += points;
        }
        updatePointsIndicator();
        updateSelectedFlags();
        updateCardStates();
    });

    return card;
}

function toggleSubmitButton() {
    const playerName = document.getElementById('player-name').value;
    const selectedCountries = document.querySelectorAll('.card.selected, .featured-card.selected').length;
    const submitButton = document.getElementById('submit-button');

    if (playerName.trim() === '') {
        submitButton.disabled = true;
        submitButton.style.backgroundColor = '#ddd';
        submitButton.style.color = '#aaa';
        submitButton.style.cursor = 'not-allowed';
        return;
    }

    db.collection("players").where("playerName", "==", playerName).get()
        .then((querySnapshot) => {
            if (querySnapshot.empty && selectedCountries > 0) {
                submitButton.disabled = false;
                submitButton.style.backgroundColor = '#007bff';
                submitButton.style.color = '#fff';
                submitButton.style.cursor = 'pointer';
            } else {
                submitButton.disabled = true;
                submitButton.style.backgroundColor = '#ddd';
                submitButton.style.color = '#aaa';
                submitButton.style.cursor = 'not-allowed';
            }
        })
        .catch((error) => {
            console.error("Error checking player name: ", error);
        });
}

document.getElementById('player-name').addEventListener('input', toggleSubmitButton);

document.getElementById('submit-button').addEventListener('click', () => {
    const playerName = document.getElementById('player-name').value;
    const selectedCountries = Array.from(document.querySelectorAll('.card.selected, .featured-card.selected')).map(card => card.querySelector('h2').textContent);
    const dateTime = new Date().toISOString();
    const playerData = {
        playerName: playerName,
        selectedCountries: selectedCountries,
        dateTime: dateTime,
        points: 0
    };

    db.collection("players").add(playerData)
        .then(() => {
            console.log("Document successfully written!");
            // Redirect to registered.html
            window.location.href = "registered.html";
        })
        .catch((error) => {
            console.error("Error writing document: ", error);
        });
});

fetch('countries.json')
    .then(response => response.json())
    .then(data => {
        const featuredCountries = {
            'United States': { code: 'us', points: 10, text: '*United States only get points for Gold 🥇 medals' },
            'China': { code: 'cn', points: 8, text: '*China gets only 1 point from Gold 🥇 and Silver 🥈 medals as well' },
            'France': { code: 'fr', points: 10, text: '*France gets 2 points for both Gold 🥇 and Bronze 🥉 medals as well' }
        };
        const featuredContainer = document.getElementById('featured-country-cards');
        const cardContainer = document.getElementById('country-cards');

        data.forEach(item => {
            const countryName = item.NOC;
            const countryCode = item.Code;
            const points = item.Draft;

            if (featuredCountries[countryName]) {
                const { code, points, text } = featuredCountries[countryName];
                const featuredCard = createFeaturedCard(countryName, code, points, text);
                featuredContainer.appendChild(featuredCard);
            } else {
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.points = points;

                card.innerHTML = `
                    <img src="https://unpkg.com/flag-icons@6.6.6/flags/4x3/${countryCode}.svg" class="flag" onerror="handleFlagError(event)">
                    <h2>${countryName}</h2>
                    <p>Cost: ${points} 🔵</p>
                `;

                card.addEventListener('click', () => {
                    if (card.classList.contains('selected')) {
                        card.classList.remove('selected');
                        usedPoints -= points;
                    } else if (!card.classList.contains('unaffordable')) {
                        card.classList.add('selected');
                        usedPoints += points;
                    }
                    updatePointsIndicator();
                    updateSelectedFlags();
                    updateCardStates();
                });

                cardContainer.appendChild(card);
            }
        });

        updatePointsIndicator();
        updateCardStates();
    })
    .catch(error => console.error('Error fetching JSON:', error));
