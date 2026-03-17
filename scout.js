async function fetchFTC(endpoint, season, apiKey) {
    const url = `https://ftc-api.firstinspires.org/v2.0/${season}/${endpoint}`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Basic ${apiKey}` }
    });
    if (!response.ok) throw new Error("API Request Failed");
    return response.json();
}

async function runScout() {
    const apiKey = document.getElementById('apiKey').value;
    const season = document.getElementById('season').value;
    const eventCode = document.getElementById('eventCode').value;
    const status = document.getElementById('status');
    const tableBody = document.getElementById('resultsBody');
    
    status.innerText = "Fetching data...";
    tableBody.innerHTML = "";

    try {
        // 1. Get Rankings (for RP and general standing)
        const rankData = await fetchFTC(`rankings/${eventCode}`, season, apiKey);
        
        // 2. Get Score Details (for Autonomous specifics)
        // We look at 'qual' matches to see their average performance
        const scoreData = await fetchFTC(`scores/${eventCode}/qual`, season, apiKey);

        // 3. Process Data
        let analysis = rankData.rankings.map(team => {
            const teamNum = team.teamNumber;
            
            // Filter matches where this team played (Red or Blue alliance)
            const teamMatches = scoreData.matchScores.filter(m => 
                m.alliances.some(a => a.teams.includes(teamNum))
            );

            // Calculate Avg Auto for this team
            const totalAuto = teamMatches.reduce((sum, m) => {
                const alliance = m.alliances.find(a => a.teams.includes(teamNum));
                return sum + (alliance.autoPoints || 0);
            }, 0);

            const avgAuto = teamMatches.length > 0 ? (totalAuto / teamMatches.length).toFixed(2) : 0;
            
            // "AI" Weighted Score Calculation
            // We weigh RP at 40% and Auto Performance at 60% (Auto wins elims!)
            const scoreIndex = (team.rpPerMatch * 0.4) + (avgAuto * 0.6);

            return {
                teamNumber: teamNum,
                rp: team.rpPerMatch,
                auto: avgAuto,
                scoreIndex: scoreIndex
            };
        });

        // 4. Sort by Score Index (Highest to Lowest)
        analysis.sort((a, b) => b.scoreIndex - a.scoreIndex);

        // 5. Display
        analysis.forEach((team, index) => {
            const row = `
                <tr class="${index === 0 ? 'rank-1' : ''}">
                    <td>${index + 1}</td>
                    <td>${team.teamNumber}</td>
                    <td>${team.rp}</td>
                    <td>${team.auto}</td>
                    <td>${team.scoreIndex.toFixed(2)}</td>
                </tr>`;
            tableBody.innerHTML += row;
        });

        status.innerText = "Analysis Complete!";
    } catch (err) {
        status.innerText = "Error: Make sure your API key and Event Code are correct.";
        console.error(err);
    }
}
