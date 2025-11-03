let geographyData = [];

// CSV 파일을 읽어오는 함수
async function loadCSV() {
    try {
        const response = await fetch('geography_data.csv');
        const csvText = await response.text();
        console.log('CSV Text loaded:', csvText); // CSV 파일 내용 확인
        
        // CSV를 파싱하여 객체 배열로 변환
        const lines = csvText.trim().split('\n');
        const headers = ['Region', 'Country', 'Fact']; // 헤더를 고정값으로 설정
        console.log('Headers:', headers);
        
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
        
        console.log(`${geographyData.length}개의 데이터를 로드했습니다.`);
        // 데이터 로드 완료 후 시작 버튼 활성화
        enableStartButtons();
    } catch (error) {
        console.error('CSV 파일을 로드하는 중 오류가 발생했습니다:', error);
        alert('CSV 파일을 불러올 수 없습니다. geography_data.csv 파일이 있는지 확인하세요.');
    }
}

// CSV 라인을 파싱하는 함수 (따옴표 안의 쉼표 처리)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
            // Skip the quote character
            continue;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    
    // 비어있는 열을 빈 문자열로 채움
    while (result.length < 3) {  // Region, Country, Fact 총 3개의 열
        result.push('');
    }
    return result;
}

// 시작 버튼들을 활성화하는 함수
function enableStartButtons() {
    const buttons = document.querySelectorAll('#home-screen button');
    buttons.forEach(button => {
        button.disabled = false;
        button.textContent = button.textContent.replace(' (로딩 중...)', '');
    });
}

// 페이지 로드 시 CSV 파일 로드
document.addEventListener('DOMContentLoaded', function() {
    // 시작 버튼들을 비활성화하고 로딩 표시
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
let usedFacts = [];

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function getFactToCountryQuestion() {
    console.log('Geography Data:', geographyData); // 데이터 확인용 로그
    if (!geographyData || geographyData.length === 0) {
        console.error('Geography data is empty or not loaded');
        return null;
    }
    
    // 사용하지 않은 문제만 필터링
    const unusedEntries = geographyData.filter(item => !usedFacts.includes(item.Fact));
    
    // 모든 문제를 다 풀었으면 다시 초기화
    if (unusedEntries.length === 0) {
        usedFacts = [];
        unusedEntries.push(...geographyData);
    }
    
    const entry = unusedEntries[Math.floor(Math.random() * unusedEntries.length)];
    usedFacts.push(entry.Fact); // 사용한 문제 기록
    console.log('Selected entry:', entry); // 선택된 항목 확인용 로그
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
        explanation: `<strong>${entry.Country}</strong>에 대한 정보입니다.<br><br>지역: ${entry.Region}<br>설명: ${entry.Fact}`
    };
}

function getCountryToFactQuestion() {
    // 사용하지 않은 문제만 필터링
    const unusedEntries = geographyData.filter(item => !usedFacts.includes(item.Fact));
    
    // 모든 문제를 다 풀었으면 다시 초기화
    if (unusedEntries.length === 0) {
        usedFacts = [];
        unusedEntries.push(...geographyData);
    }
    
    const correctFactEntry = unusedEntries[Math.floor(Math.random() * unusedEntries.length)];
    usedFacts.push(correctFactEntry.Fact); // 사용한 문제 기록
    const correctCountry = correctFactEntry.Country;
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
        explanation: `<strong>${correctCountry}</strong>에 대한 정보입니다.<br><br>지역: ${correctFactEntry.Region}<br>설명: ${correctFactEntry.Fact}`
    };
}

function getAllFactsForCountry(country) {
    const facts = geographyData.filter(item => item.Country === country);
    let allFacts = `<strong>'${country}'</strong>에 대한 상세 정보입니다.<br><br>`;
    
    const regions = [...new Set(facts.map(item => item.Region))];
    regions.forEach(region => {
        allFacts += `<strong>지역:</strong> ${region}<br>`;
    });
    allFacts += `<br>`;
    
    facts.forEach(fact => {
        allFacts += `• ${fact.Fact}<br>`; // [수정] 가독성을 위해 불렛 포인트 추가
    });
    allFacts += `<br>`;
    
    return allFacts;
}

function loadNewQuestion() {
    const feedbackDiv = document.getElementById('feedback');
    const explanationBox = document.getElementById('explanation-box');
    
    feedbackDiv.style.display = 'none';
    explanationBox.style.display = 'none';
    
    // [수정] instruction-message는 더 이상 사용하지 않음
    const instructionDiv = document.getElementById('instruction-message');
    if (instructionDiv) {
        instructionDiv.remove(); // 아예 삭제
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
        if (currentMode === 'fact_to_country') {
            currentQuestionData = getFactToCountryQuestion();
        } else {
            currentQuestionData = getCountryToFactQuestion();
        }
        if (!currentQuestionData) {
            alert('데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }
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
    // [수정] 이미 답을 했으면 어떤 클릭도 무시
    if (isAnswered) {
        return; 
    }
    
    isAnswered = true; // [수정] 함수 맨 위에서 상태 변경

    const options = document.getElementById('options-list').children;
    const feedbackDiv = document.getElementById('feedback');
    
    // [수정] 모달(팝업) 요소 가져오기
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalExplanation = document.getElementById('modal-explanation');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');

    // [수정] 공통 로직: 모든 옵션의 클릭 비활성화 및 정답/오답 표시
    Array.from(options).forEach(li => {
        const optionText = li.textContent.substring(3);
        if (optionText === currentQuestionData.correctAnswer) {
            li.classList.add('correct');
        } else if (li === selectedLi) {
            li.classList.add('incorrect');
        }
        // 모든 옵션 클릭 비활성화
        li.onclick = null;
        li.style.cursor = 'not-allowed';
        li.style.opacity = '0.7';
    });

    if (selectedOption === currentQuestionData.correctAnswer) {
        // [수정] 정답일 경우
        feedbackDiv.innerHTML = '정답입니다!';
        feedbackDiv.classList.remove('incorrect');
        feedbackDiv.classList.add('correct');
        feedbackDiv.style.display = 'block';
        
        if (!isReviewMode) {
            score++;
        }
        
        // 설명 박스(explanationBox)는 띄우지 않음
        
        // 1.5초 후 자동으로 다음 문제로 넘어감
        setTimeout(() => {
            loadNewQuestion();
        }, 1500);

    } else {
        // [수정] 오답일 경우
        
        // 페이지 내 피드백과 설명은 숨김
        feedbackDiv.style.display = 'none';
        
        // 오답 노트에 추가
        if (!isReviewMode) {
            wrongAnswers.push(currentQuestionData);
        }
        
        // 모달(팝업) 내용 설정
        modalTitle.textContent = '틀렸습니다';
        
        // 정답 국가의 모든 특징 표시
        let correctCountry;
        if (currentQuestionData.type === 'fact_to_country') {
            correctCountry = currentQuestionData.correctAnswer;
        } else {
            // country_to_fact 타입의 경우, 질문에서 국가명 추출
            const questionText = currentQuestionData.questionText;
            const match = questionText.match(/'([^']+)'/);
            correctCountry = match ? match[1] : '';
        }
        
        if (correctCountry) {
            modalExplanation.innerHTML = getAllFactsForCountry(correctCountry);
        } else {
            // 혹시 모를 예외 처리
            modalExplanation.innerHTML = currentQuestionData.explanation;
        }

        // 확인 버튼 클릭 시 모달 닫고 다음 문제 로드
        modalConfirmBtn.onclick = () => {
            modalOverlay.style.display = 'none';
            loadNewQuestion();
        };
        
        // 모달 보이기
        modalOverlay.style.display = 'flex';
    }
        
    // [수정] 점수 표시는 정답/오답 공통으로 밖으로 뺌
    if (!isReviewMode) {
        document.getElementById('score-display').textContent = `점수: ${score}`;
    }
    
    // [수정] "정답 다시 클릭" 로직 (else 블록) 완전 삭제
}


function startGame(mode) {
    currentMode = mode;
    score = 0;
    questionCount = 0;
    wrongAnswers = [];
    isReviewMode = false;
    usedFacts = []; // 사용된 문제 초기화
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('quiz-screen').classList.add('active');
    document.getElementById('end-quiz-btn').style.display = 'block';
    loadNewQuestion();
}

function endGame() {
    document.getElementById('quiz-screen').classList.remove('active');
    document.getElementById('end-screen').classList.add('active');
    document.getElementById('end-quiz-btn').style.display = 'none';
    
    // [수정] 게임 종료 시 모달이 혹시 떠있으면 숨김
    document.getElementById('modal-overlay').style.display = 'none';
    
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

// 키보드 지원
document.addEventListener('keydown', function(event) {
    // [수정] 모달이 떠 있을 때는 키보드 입력 무시
    if (document.getElementById('modal-overlay').style.display === 'flex') {
        if (event.key === 'Enter') {
            // 엔터 키로 모달 닫기
            document.getElementById('modal-confirm-btn').click();
        }
        return;
    }

    if (document.getElementById('quiz-screen').classList.contains('active')) {
        const options = document.getElementById('options-list').children;
        if (event.key >= '1' && event.key <= '4' && options[event.key - 1]) {
            const li = options[event.key - 1];
            if (li.onclick) { // 클릭 가능한 상태인지 확인
                const optionText = li.textContent.substring(3);
                checkAnswer(li, optionText);
            }
        }
    }
});