let geographyData = [];

// <--- 추가: 출제 가능한 문제 인덱스(혹은 pool)를 관리할 배열들 --->
let availableFactToCountryIndices = [];
let availableCountryToFactIndices = [];

async function loadCSV() {
    try {
        const response = await fetch('geography_data.csv');
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(header => header.replace(/"/g, '').trim());
        geographyData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index];
                });
                geographyData.push(obj);
            }
        }

        // <--- CSV를 불러온 뒤, idx 풀도 만든다 --->
        resetAvailableQuestionIndices();

        console.log(`${geographyData.length}개의 데이터를 로드했습니다.`);
        enableStartButtons();
    } catch (error) {
        console.error('CSV 파일을 로드하는 중 오류가 발생했습니다:', error);
        alert('CSV 파일을 불러올 수 없습니다. geography_data.csv 파일이 있는지 확인하세요.');
    }
}

function resetAvailableQuestionIndices() {
    availableFactToCountryIndices = [];
    availableCountryToFactIndices = [];
    for (let i = 0; i < geographyData.length; i++) {
        availableFactToCountryIndices.push(i);
        availableCountryToFactIndices.push(i);
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function enableStartButtons() {
    const buttons = document.querySelectorAll('#home-screen button');
    buttons.forEach(button => {
        button.disabled = false;
        button.textContent = button.textContent.replace(' (로딩 중...)', '');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('#home-screen button');
    buttons.forEach(button => {
        button.disabled = true;
        button.textContent += ' (로딩 중...)';
    });
    loadCSV();
});

let score = 0;
let questionCount = 0;
let currentQuestionData = {};
let currentMode = '';
let wrongAnswers = [];
let isReviewMode = false;
let reviewIndex = 0;
let isAnswered = false;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// <--- 아래 두 함수에서, 중복 방지 위해 준비된 인덱스 pool에서 문제를 꺼냄 --->
function getFactToCountryQuestion() {
    if (availableFactToCountryIndices.length === 0) {
        return null; // 남은 문제가 없음
    }
    shuffleArray(availableFactToCountryIndices);
    const idx = availableFactToCountryIndices.pop(); // pool에서 꺼내면서 소진
    const entry = geographyData[idx];
    const correctCountry = entry.Country;
    const allCountries = [...new Set(geographyData.map(item => item.Country))].filter(c => c !== correctCountry);

    shuffleArray(allCountries);
    const incorrectCountries = allCountries.slice(0, 3);

    const options = [correctCountry, ...incorrectCountries];
    shuffleArray(options);

    return {
        type: 'fact_to_country',
        questionText: `다음 설명에 해당하는 나라는 어디일까요?<br><br><strong>${entry.Fact}</strong>`,
        correctAnswer: correctCountry,
        options: options,
        explanation: `<strong>${entry.Country}</strong>에 대한 정보입니다.<br><br>지역: ${entry.Region}<br>분류: ${entry.Category}<br>설명: ${entry.Fact}`
    };
}

function getCountryToFactQuestion() {
    if (availableCountryToFactIndices.length === 0) {
        return null; // 남은 문제가 없음
    }
    shuffleArray(availableCountryToFactIndices);
    const idx = availableCountryToFactIndices.pop();
    const correctCountry = geographyData[idx].Country;
    const factsForCountry = geographyData.filter(item => item.Country === correctCountry);
    const correctFactEntry = factsForCountry[Math.floor(Math.random() * factsForCountry.length)];
    const correctFact = correctFactEntry.Fact;

    const otherFacts = geographyData.filter(item => item.Country !== correctCountry).map(item => item.Fact);
    shuffleArray(otherFacts);
    const incorrectFacts = otherFacts.slice(0, 3);

    const options = [correctFact, ...incorrectFacts];
    shuffleArray(options);

    return {
        type: 'country_to_fact',
        questionText: `다음 설명 중 <strong>'${correctCountry}'</strong>에 대한 설명은 무엇일까요?`,
        correctAnswer: correctFact,
        options: options,
        explanation: `<strong>${correctCountry}</strong>에 대한 정보입니다.<br><br>지역: ${correctFactEntry.Region}<br>분류: ${correctFactEntry.Category}<br>설명: ${correctFactEntry.Fact}`
    };
}

function getAllFactsForCountry(country) {
    const facts = geographyData.filter(item => item.Country === country);
    let allFacts = `<strong>${country}의 모든 특징:</strong><br><br>`;
    const regions = [...new Set(facts.map(item => item.Region))];
    regions.forEach(region => {
        allFacts += `<strong>지역:</strong> ${region}<br>`;
    });
    allFacts += `<br>`;
    const categories = [...new Set(facts.map(item => item.Category))];
    categories.forEach(category => {
        const categoryFacts = facts.filter(item => item.Category === category);
        allFacts += `<strong>${category}:</strong><br>`;
        categoryFacts.forEach(fact => {
            allFacts += `${fact.Fact}<br>`;
        });
        allFacts += `<br>`;
    });
    return allFacts;
}

function loadNewQuestion() {
    const feedbackDiv = document.getElementById('feedback');
    const explanationBox = document.getElementById('explanation-box');
    const instructionDiv = document.getElementById('instruction-message');
    feedbackDiv.style.display = 'none';
    explanationBox.style.display = 'none';
    if (instructionDiv) {
        instructionDiv.style.display = 'none';
    }
    isAnswered = false;

    if (isReviewMode) {
        if (reviewIndex >= wrongAnswers.length) {
            alert('오답 문제를 모두 풀었습니다!');
            endGame();
            return;
        }
        currentQuestionData = wrongAnswers[reviewIndex];
        reviewIndex++;
        document.getElementById('progress-info').textContent = `오답 문제 (${reviewIndex}/${wrongAnswers.length})`;
    } else {
        let question = null;
        if (currentMode === 'fact_to_country') {
            question = getFactToCountryQuestion();
        } else {
            question = getCountryToFactQuestion();
        }
        if (!question) {
            // 더 이상 출제할 문제가 없으면 게임 종료
            alert('모든 문제를 풀었습니다!');
            endGame();
            return;
        }
        currentQuestionData = question;
        questionCount++;
        document.getElementById('progress-info').textContent = `문제 ${questionCount}번째`;
    }

    document.getElementById('question-text').innerHTML = currentQuestionData.questionText;
    const optionsList = document.getElementById('options-list');
    optionsList.innerHTML = '';
    currentQuestionData.options.forEach((option, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${option}`;
        li.onclick = () => checkAnswer(li, option);
        optionsList.appendChild(li);
    });
}

function checkAnswer(selectedLi, selectedOption) {
    if (isAnswered && selectedOption !== currentQuestionData.correctAnswer) {
        return;
    }
    const options = document.getElementById('options-list').children;
    const feedbackDiv = document.getElementById('feedback');
    const explanationBox = document.getElementById('explanation-box');
    let instructionDiv = document.getElementById('instruction-message');
    if (!instructionDiv) {
        instructionDiv = document.createElement('div');
        instructionDiv.id = 'instruction-message';
        instructionDiv.style.cssText = `
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
            padding: 10px;
            border-radius: 8px;
            margin: 10px 0;
            font-weight: bold;
            text-align: center;
            display: none;
        `;
        document.querySelector('.question-box').appendChild(instructionDiv);
    }

    if (!isAnswered) {
        isAnswered = true;
        Array.from(options).forEach(li => {
            const optionText = li.textContent.substring(3);
            if (optionText === currentQuestionData.correctAnswer) {
                li.classList.add('correct');
            } else if (li === selectedLi) {
                li.classList.add('incorrect');
            }
            if (optionText !== currentQuestionData.correctAnswer) {
                li.onclick = null;
                li.style.cursor = 'not-allowed';
                li.style.opacity = '0.6';
            }
        });

        feedbackDiv.style.display = 'block';
        if (selectedOption === currentQuestionData.correctAnswer) {
            feedbackDiv.innerHTML = '정답입니다!';
            feedbackDiv.classList.remove('incorrect');
            feedbackDiv.classList.add('correct');
            if (!isReviewMode) {
                score++;
            }
            explanationBox.innerHTML = currentQuestionData.explanation;
            explanationBox.style.display = 'block';
            setTimeout(() => {
                loadNewQuestion();
            }, 1000);
        } else {
            feedbackDiv.innerHTML = `틀렸습니다.<br>정답은 <strong>'${currentQuestionData.correctAnswer}'</strong>입니다.`;
            feedbackDiv.classList.remove('correct');
            feedbackDiv.classList.add('incorrect');
            let correctCountry;
            if (currentQuestionData.type === 'fact_to_country') {
                correctCountry = currentQuestionData.correctAnswer;
            } else {
                const questionText = currentQuestionData.questionText;
                const match = questionText.match(/'([^']+)'/);
                correctCountry = match ? match[1] : '';
            }
            if (correctCountry) {
                explanationBox.innerHTML = getAllFactsForCountry(correctCountry);
            } else {
                explanationBox.innerHTML = currentQuestionData.explanation;
            }
            explanationBox.style.display = 'block';
            if (!isReviewMode) {
                wrongAnswers.push(currentQuestionData);
            }
            instructionDiv.innerHTML = '정답을 한번 더 클릭하면 다음 문제로 넘어갑니다.';
            instructionDiv.style.display = 'block';
        }
        if (!isReviewMode) {
            document.getElementById('score-display').textContent = `점수: ${score}`;
        }
    } else {
        if (selectedOption === currentQuestionData.correctAnswer) {
            instructionDiv.style.display = 'none';
            loadNewQuestion();
        }
    }
}

function startGame(mode) {
    currentMode = mode;
    score = 0;
    questionCount = 0;
    wrongAnswers = [];
    isReviewMode = false;
    resetAvailableQuestionIndices(); // <<< 새 시작 시 문제 풀 초기화
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('quiz-screen').classList.add('active');
    document.getElementById('end-quiz-btn').style.display = 'block';
    loadNewQuestion();
}

function endGame() {
    document.getElementById('quiz-screen').classList.remove('active');
    document.getElementById('end-screen').classList.add('active');
    document.getElementById('end-quiz-btn').style.display = 'none';
    const finalScoreDiv = document.getElementById('final-score');
    const reviewButton = document.getElementById('review-button');
    if (isReviewMode) {
        finalScoreDiv.innerHTML = '오답 문제를 모두 완료했습니다!<br>수고하셨습니다!';
        reviewButton.style.display = 'none';
    } else {
        const percentage = questionCount > 0 ? Math.round((score / questionCount) * 100) : 0;
        finalScoreDiv.innerHTML = `총 <strong>${questionCount}</strong>문제 중 <strong>${score}</strong>문제를 맞히셨습니다!<br>정답률: <strong>${percentage}%</strong>`;
        if (wrongAnswers.length > 0) {
            reviewButton.style.display = 'inline-block';
        } else {
            reviewButton.style.display = 'none';
        }
    }
}

function restartGame() {
    document.getElementById('end-screen').classList.remove('active');
    document.getElementById('home-screen').classList.add('active');
}

function showReview() {
    if (wrongAnswers.length === 0) {
        alert('틀린 문제가 없습니다!');
        return;
    }
    isReviewMode = true;
    reviewIndex = 0;
    document.getElementById('end-screen').classList.remove('active');
    document.getElementById('quiz-screen').classList.add('active');
    document.getElementById('score-display').textContent = '오답 노트 모드';
    document.getElementById('end-quiz-btn').style.display = 'block';
    loadNewQuestion();
}

document.addEventListener('keydown', function(event) {
    if (document.getElementById('quiz-screen').classList.contains('active')) {
        const options = document.getElementById('options-list').children;
        if (event.key >= '1' && event.key <= '4' && options[event.key - 1]) {
            const li = options[event.key - 1];
            if (li.onclick) {
                const optionText = li.textContent.substring(3);
                checkAnswer(li, optionText);
            }
        }
    }
});
