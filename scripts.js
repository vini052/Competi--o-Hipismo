document.getElementById('competitorForm').addEventListener('submit', addCompetitor);
document.getElementById('resetButton').addEventListener('click', resetAll);
document.getElementById('showIndividualButton').addEventListener('click', showIndividualResults);
document.getElementById('groupByTeamButton').addEventListener('click', groupByTeam);

let originalRows = [];

function addCompetitor(event) {
    event.preventDefault();
    
    const competitorName = document.getElementById('competitorName').value;
    const horseName = document.getElementById('horseName').value;
    const federation = document.getElementById('federation').value;
    const team = document.getElementById('team').checked ? 'Sim' : 'Não';
    
    const table = document.getElementById('competitorsTable').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    const order = table.rows.length;
    
    newRow.innerHTML = `
        <td>${order}</td>
        <td>${competitorName}</td>
        <td>${horseName}</td>
        <td>${federation}</td>
        <td>${team}</td>
        <td>
            <input type="number" class="pointsLostManual" value="0" step="1">
        </td>
        <td>
            <input type="number" class="timeRecorded" step="0.01">
            <button onclick="calculateResults(this)">Calcular</button>
        </td>
        <td class="approximation"></td>
        <td><button onclick="removeCompetitor(this)">Remover</button></td>
    `;
    
    document.getElementById('competitorForm').reset();
    originalRows.push(newRow.cloneNode(true));
    saveData();
}

function calculateResults(button) {
    const row = button.parentElement.parentElement;
    const recordedTime = parseFloat(row.querySelector('.timeRecorded').value);
    const idealTime = parseFloat(document.getElementById('idealTime').value);
    const allowedTimeBelow = parseFloat(document.getElementById('allowedTimeBelow').value);
    const allowedTimeAbove = parseFloat(document.getElementById('allowedTimeAbove').value);
    
    const pointsLostManual = parseFloat(row.querySelector('.pointsLostManual').value);
    
    let approximation = Math.abs(recordedTime - idealTime).toFixed(2);
    let pointsLostByTime = 0;
    
    if (recordedTime < allowedTimeBelow) {
        pointsLostByTime = Math.ceil((allowedTimeBelow - recordedTime));
    } else if (recordedTime > allowedTimeAbove) {
        pointsLostByTime = Math.ceil((recordedTime - allowedTimeAbove));
    }
    
    const totalPointsLost = pointsLostManual + pointsLostByTime;
    
    row.querySelector('.approximation').textContent = approximation;
    row.querySelector('.pointsLostManual').parentElement.innerHTML = `${pointsLostManual} + ${pointsLostByTime} = ${totalPointsLost}`;
    row.querySelector('.timeRecorded').setAttribute('disabled', 'true');
    button.remove();
    
    sortCompetitors();
    saveData();
}

function sortCompetitors() {
    const table = document.getElementById('competitorsTable').getElementsByTagName('tbody')[0];
    const rows = Array.from(table.rows);
    
    rows.sort((a, b) => {
        const pointsA = parseFloat(a.cells[5].textContent.split('=')[1].trim());
        const pointsB = parseFloat(b.cells[5].textContent.split('=')[1].trim());
        const approxA = parseFloat(a.cells[7].textContent);
        const approxB = parseFloat(b.cells[7].textContent);
        
        if (pointsA !== pointsB) {
            return pointsA - pointsB;
        } else {
            return approxA - approxB;
        }
    });
    
    rows.forEach(row => {
        table.appendChild(row);
    });
}

function removeCompetitor(button) {
    const row = button.parentElement.parentElement;
    row.remove();
    sortCompetitors();
    saveData(); // Reordena e salva após remover
}

function resetAll() {
    document.getElementById('competitorsTable').getElementsByTagName('tbody')[0].innerHTML = '';
    
    document.getElementById('idealTime').value = '';
    document.getElementById('allowedTimeBelow').value = '';
    document.getElementById('allowedTimeAbove').value = '';
    
    document.getElementById('idealTime').removeAttribute('disabled');
    document.getElementById('allowedTimeBelow').removeAttribute('disabled');
    document.getElementById('allowedTimeAbove').removeAttribute('disabled');
    
    originalRows = [];
    localStorage.removeItem('hipismoData');
}

document.querySelectorAll('.ideal-time input').forEach(input => {
    input.addEventListener('change', function() {
        if (document.getElementById('idealTime').value && document.getElementById('allowedTimeBelow').value && document.getElementById('allowedTimeAbove').value) {
            document.getElementById('idealTime').setAttribute('disabled', 'true');
            document.getElementById('allowedTimeBelow').setAttribute('disabled', 'true');
            document.getElementById('allowedTimeAbove').setAttribute('disabled', 'true');
            saveData();
        }
    });
});

function groupByTeam() {
    saveCurrentState();
    const table = document.getElementById('competitorsTable').getElementsByTagName('tbody')[0];
    const rows = Array.from(table.rows);
    const teams = {};

    rows.forEach(row => {
        const federation = row.cells[3].textContent; // Agrupando por federação
        const team = row.cells[4].textContent;
        const points = parseFloat(row.cells[5].textContent.split('=')[1].trim());
        const time = parseFloat(row.querySelector('.timeRecorded').value);
        const approx = parseFloat(row.cells[7].textContent);

        if (team === 'Sim') {
            if (!teams[federation]) {
                teams[federation] = {
                    members: [],
                    totalPoints: 0,
                    totalTime: 0,
                    totalApprox: 0,
                };
            }
            teams[federation].members.push({ row, points, time, approx });
        }
    });

    const teamEntries = Object.entries(teams).map(([federation, data]) => {
        const sortedMembers = data.members.sort((a, b) => a.points - b.points);
        const discarded = sortedMembers.pop();

        const totalPoints = sortedMembers.reduce((sum, member) => sum + member.points, 0);
        const totalTime = sortedMembers.reduce((sum, member) => sum + member.time, 0);
        const totalApprox = sortedMembers.reduce((sum, member) => sum + member.approx, 0);

        return { federation, members: sortedMembers, totalPoints, totalTime, totalApprox, discarded };
    });

    teamEntries.sort((a, b) => {
        if (a.totalPoints !== b.totalPoints) {
            return a.totalPoints - b.totalPoints;
        } else {
            return a.totalApprox - b.totalApprox;
        }
    });

    table.innerHTML = '';

    teamEntries.forEach(({ federation, members, totalPoints, totalTime, totalApprox, discarded }) => {
        members.forEach(({ row }) => {
            table.appendChild(row);
        });

        if (discarded) {
            table.appendChild(discarded.row);
        }

        const summaryRow = table.insertRow();
        summaryRow.innerHTML = `
            <td colspan="5">Federação ${federation} - Total</td>
            <td>${totalPoints.toFixed(2)}</td>
            <td>${totalTime.toFixed(2)}</td>
            <td>${totalApprox.toFixed(2)}</td>
            <td></td>
        `;
        summaryRow.style.fontWeight = 'bold';
    });
}

function showIndividualResults() {
    loadSavedState();
    sortCompetitors();
}

function saveCurrentState() {
    const table = document.getElementById('competitorsTable').getElementsByTagName('tbody')[0];
    originalRows = Array.from(table.rows).map(row => row.cloneNode(true));
}

function loadSavedState() {
    const table = document.getElementById('competitorsTable').getElementsByTagName('tbody')[0];
    table.innerHTML = '';

    originalRows.forEach(row => {
        table.appendChild(row);
    });
}

function saveData() {
    const data = {
        competitors: Array.from(document.querySelectorAll('#competitorsTable tbody tr')).map(row => {
            const timeInput = row.querySelector('.timeRecorded');
            const pointsInput = row.querySelector('.pointsLostManual');
            return {
                order: row.cells[0].textContent,
                competitorName: row.cells[1].textContent,
                horseName: row.cells[2].textContent,
                federation: row.cells[3].textContent,
                team: row.cells[4].textContent,
                points: pointsInput ? pointsInput.value : row.cells[5].textContent,
                time: timeInput ? timeInput.value : '',
                approximation: row.cells[7].textContent
            };
        }),
        idealTime: document.getElementById('idealTime').value,
        allowedTimeBelow: document.getElementById('allowedTimeBelow').value,
        allowedTimeAbove: document.getElementById('allowedTimeAbove').value
    };
    localStorage.setItem('hipismoData', JSON.stringify(data));
}

function loadData() {
    const data = JSON.parse(localStorage.getItem('hipismoData'));
    if (data) {
        const table = document.getElementById('competitorsTable').getElementsByTagName('tbody')[0];
        data.competitors.forEach(comp => {
            const newRow = table.insertRow();
            const timeInputDisabled = comp.time !== '' ? 'disabled' : '';
            const pointsContent = comp.points.includes('=') ? comp.points : `<input type="number" class="pointsLostManual" value="${comp.points}" step="1">`;
            const timeContent = comp.time !== '' ? `<input type="number" class="timeRecorded" step="0.01" value="${comp.time}" ${timeInputDisabled}>` : `<input type="number" class="timeRecorded" step="0.01" value="${comp.time}"><button onclick="calculateResults(this)">Calcular</button>`;

            newRow.innerHTML = `
                <td>${comp.order}</td>
                <td>${comp.competitorName}</td>
                <td>${comp.horseName}</td>
                <td>${comp.federation}</td>
                <td>${comp.team}</td>
                <td>${pointsContent}</td>
                <td>${timeContent}</td>
                <td class="approximation">${comp.approximation}</td>
                <td><button onclick="removeCompetitor(this)">Remover</button></td>
            `;
            originalRows.push(newRow.cloneNode(true));
        });
        document.getElementById('idealTime').value = data.idealTime;
        document.getElementById('allowedTimeBelow').value = data.allowedTimeBelow;
        document.getElementById('allowedTimeAbove').value = data.allowedTimeAbove;

        // Se os tempos já estão preenchidos, desabilite os campos de tempo ideal
        if (data.idealTime && data.allowedTimeBelow && data.allowedTimeAbove) {
            document.getElementById('idealTime').setAttribute('disabled', 'true');
            document.getElementById('allowedTimeBelow').setAttribute('disabled', 'true');
            document.getElementById('allowedTimeAbove').setAttribute('disabled', 'true');
        }
    }
}

document.addEventListener('DOMContentLoaded', loadData);
