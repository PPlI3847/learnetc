let data = [];
let currentMode = '';
let currentSentence = null;
let originalSentence = [];
let wrongAttempts = 0;
let dropIndicator = null;

const eng_mainMenu = document.getElementById('eng_main-menu');
const eng_gameArea = document.getElementById('eng_game-area');
const eng_translationText = document.getElementById('eng_translation-text');
const eng_promptContainer = document.getElementById('eng_prompt-container');
const eng_wordBank = document.getElementById('eng_word-bank');
const eng_checkButton = document.getElementById('eng_check-button');
const eng_nextButton = document.getElementById('eng_next-button');
const eng_backButton = document.getElementById('eng_back-button');
const eng_resetButton = document.getElementById('eng_reset-button');
const eng_resultMessage = document.getElementById('eng_result-message');

async function eng_loadDataAndSetupMenu() {
    try {
        const response = await fetch('eng.csv');
        if (!response.ok) {
            throw new Error('CSV 파일 로딩 실패. 파일 경로를 확인해주세요.');
        }
        const csvText = await response.text();
        data = eng_parseCSV(csvText);
        
        document.querySelectorAll('.eng_mode-button').forEach(button => {
            button.addEventListener('click', () => {
                currentMode = button.dataset.mode;
                eng_showScreen('eng_game-area');
                eng_loadNewSentence();
            });
        });
    } catch (error) {
        eng_mainMenu.innerHTML = `<p style="color:red;">오류: ${error.message}</p>`;
        console.error(error);
    }
}

eng_backButton.addEventListener('click', () => eng_showScreen('eng_main-menu'));
eng_checkButton.addEventListener('click', eng_checkAnswer);
eng_nextButton.addEventListener('click', eng_loadNewSentence);
eng_resetButton.addEventListener('click', eng_resetGame);

function eng_showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function eng_parseCSV(csv) {
    const lines = csv.trim().split('\n').filter(line => line.trim() !== '');
    const result = [];
    let currentItem = { original: [], translation: '' };
    let lastId = null;

    for (const line of lines.slice(1)) {
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (parts.length < 3) continue;
        
        const id = parts[0].trim().replace(/"/g, '');
        const type = parts[1].trim().replace(/"/g, '');
        const word = parts.slice(2).join(',').trim().replace(/"/g, '');

        if (id !== lastId && lastId !== null) {
            result.push(currentItem);
            currentItem = { original: [], translation: '' };
        }

        if (type === '원문') {
            currentItem.original.push(word);
        } else if (type === '해석') {
            currentItem.translation = word;
        }
        lastId = id;
    }
    if (lastId !== null) {
        result.push(currentItem);
    }
    return result;
}

function eng_loadNewSentence() {
    wrongAttempts = 0;
    if (data.length === 0) {
        eng_resultMessage.textContent = '불러올 데이터가 없습니다. CSV 파일 형식을 확인해주세요.';
        return;
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    currentSentence = data[randomIndex];
    originalSentence = currentSentence.original;

    eng_resultMessage.textContent = '';
    eng_wordBank.innerHTML = '';
    eng_promptContainer.innerHTML = '';
    
    if (currentMode === 'version1') {
        eng_renderVersion1();
        eng_resetButton.style.display = 'none';
    } else {
        eng_renderVersion2_3();
        eng_resetButton.style.display = 'block';
    }
}

function eng_resetGame() {
    const allWords = Array.from(document.querySelectorAll('#eng_word-order .word-tile'));
    allWords.forEach(tile => {
        tile.classList.remove('placed');
        eng_wordBank.appendChild(tile);
    });
    eng_resultMessage.textContent = '';
}

function eng_renderVersion1() {
    eng_translationText.textContent = currentSentence.translation;
    
    const wordsToHide = [];
    const indicesToHide = new Set();
    const numWordsToHide = Math.min(5, originalSentence.length);
    while (indicesToHide.size < numWordsToHide) {
        const randIndex = Math.floor(Math.random() * originalSentence.length);
        if (!indicesToHide.has(randIndex)) {
            indicesToHide.add(randIndex);
            wordsToHide.push(originalSentence[randIndex]);
        }
    }
    
    originalSentence.forEach((word, index) => {
        const span = document.createElement('span');
        span.className = 'fill-in-the-blank-word';
        if (indicesToHide.has(index)) {
            const blank = document.createElement('span');
            blank.className = 'blank-space';
            blank.dataset.answer = word;
            blank.draggable = true;
            blank.addEventListener('click', eng_handleBlankClick);
            span.appendChild(blank);
        } else {
            span.textContent = word;
        }
        eng_promptContainer.appendChild(span);
    });

    const shuffledHiddenWords = eng_shuffleArray(wordsToHide);
    
    shuffledHiddenWords.forEach(word => {
        const tile = eng_createWordTile(word);
        eng_wordBank.appendChild(tile);
    });

    eng_setupDragAndDrop();
}

function eng_renderVersion2_3() {
    eng_translationText.textContent = currentMode === 'version2' ? currentSentence.translation : '';
    
    const eng_wordOrderContainer = document.createElement('div');
    eng_wordOrderContainer.id = 'eng_word-order';
    eng_promptContainer.appendChild(eng_wordOrderContainer);

    const shuffledWords = eng_shuffleArray([...originalSentence]);
    
    shuffledWords.forEach(word => {
        const tile = eng_createWordTile(word);
        eng_wordBank.appendChild(tile);
    });
    
    eng_setupDragAndDrop();
}

function eng_createWordTile(word) {
    const tile = document.createElement('div');
    tile.textContent = word;
    tile.className = 'word-tile';
    tile.draggable = true;
    tile.addEventListener('click', eng_handleWordTileClick);
    return tile;
}

function eng_handleWordTileClick(e) {
    const wordTile = e.target;
    if (currentMode === 'version1') {
        const firstEmptyBlank = document.querySelector('.blank-space:empty');
        if (firstEmptyBlank) {
            firstEmptyBlank.textContent = wordTile.textContent;
            firstEmptyBlank.classList.add('filled');
            wordTile.style.display = 'none';
        }
    } else {
        const eng_wordOrderZone = document.getElementById('eng_word-order');
        eng_wordOrderZone.appendChild(wordTile);
        wordTile.classList.add('placed');
    }
}

function eng_handleBlankClick(e) {
    const blank = e.target;
    if (blank.textContent) {
        const wordToReturn = blank.textContent;
        blank.textContent = '';
        blank.classList.remove('filled');
        
        const wordTiles = document.querySelectorAll('.word-tile');
        for (let tile of wordTiles) {
            if (tile.textContent === wordToReturn && tile.style.display === 'none') {
                tile.style.display = 'block';
                break;
            }
        }
    }
}

function eng_handlePlacedWordClick(e) {
    const placedTile = e.target;
    if (placedTile.classList.contains('placed')) {
        placedTile.classList.remove('placed');
        eng_wordBank.appendChild(placedTile);
    }
}

function eng_setupDragAndDrop() {
    const allDraggables = document.querySelectorAll('.word-tile, .blank-space');
    allDraggables.forEach(elem => {
        elem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.textContent);
            e.dataTransfer.effectAllowed = 'move';
            e.target.classList.add('dragging');
        });
        elem.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            if (dropIndicator) {
                dropIndicator.style.display = 'none';
            }
        });
    });

    if (currentMode === 'version1') {
        const blanks = document.querySelectorAll('.blank-space');
        blanks.forEach(blank => {
            blank.addEventListener('dragover', e => e.preventDefault());
            blank.addEventListener('drop', eng_handleDropBlank);
        });
        eng_wordBank.addEventListener('dragover', e => e.preventDefault());
        eng_wordBank.addEventListener('drop', eng_handleDropBank);
    } else {
        const eng_wordOrderZone = document.getElementById('eng_word-order');
        eng_wordOrderZone.addEventListener('dragover', eng_handleDragOverZone);
        eng_wordOrderZone.addEventListener('drop', eng_handleDropOnZone);
        eng_wordOrderZone.addEventListener('click', eng_handlePlacedWordClick);
        eng_wordOrderZone.addEventListener('dragleave', (e) => {
            if (dropIndicator) {
                dropIndicator.style.display = 'none';
            }
        });

        eng_wordBank.addEventListener('dragover', e => e.preventDefault());
        eng_wordBank.addEventListener('drop', eng_handleDropBank);
    }
}

function eng_getDropTarget(x) {
    const eng_wordOrderZone = document.getElementById('eng_word-order');
    const children = Array.from(eng_wordOrderZone.children);
    let target = null;
    let targetRect = null;

    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const rect = child.getBoundingClientRect();
        if (x < rect.left + rect.width / 2) {
            target = child;
            targetRect = rect;
            break;
        }
    }
    if (!target) {
        target = null;
        const lastChild = children[children.length - 1];
        if (lastChild) {
            targetRect = lastChild.getBoundingClientRect();
        } else {
            targetRect = eng_wordOrderZone.getBoundingClientRect();
        }
    }
    return { target, targetRect };
}

function eng_handleDragOverZone(e) {
    e.preventDefault();
    const draggedElement = document.querySelector('.dragging');
    if (draggedElement && draggedElement.classList.contains('word-tile')) {
        const eng_wordOrderZone = document.getElementById('eng_word-order');
        const { target, targetRect } = eng_getDropTarget(e.clientX);
        
        if (!dropIndicator) {
            dropIndicator = document.createElement('div');
            dropIndicator.className = 'drop-indicator';
            eng_wordOrderZone.appendChild(dropIndicator);
        }
        
        dropIndicator.style.display = 'block';
        const containerRect = eng_wordOrderZone.getBoundingClientRect();

        if (target) {
            dropIndicator.style.left = `${targetRect.left - containerRect.left - 2}px`;
        } else {
            dropIndicator.style.left = `${targetRect.right - containerRect.left + 5}px`;
        }
    }
}

function eng_handleDropOnZone(e) {
    e.preventDefault();
    const draggedElement = document.querySelector('.dragging');
    const eng_dropZone = document.getElementById('eng_word-order');
    if (draggedElement && draggedElement.classList.contains('word-tile')) {
        const { target } = eng_getDropTarget(e.clientX);
        
        if (target) {
            eng_dropZone.insertBefore(draggedElement, target);
        } else {
            eng_dropZone.appendChild(draggedElement);
        }
        draggedElement.classList.add('placed');
    }
    if (dropIndicator) {
        dropIndicator.style.display = 'none';
    }
}

function eng_handleDropBlank(e) {
    e.preventDefault();
    const draggedText = e.dataTransfer.getData('text/plain');
    const targetBlank = e.target;
    const draggedElement = document.querySelector('.word-tile.dragging');

    if (targetBlank.textContent === '' && draggedElement) {
        targetBlank.textContent = draggedText;
        targetBlank.classList.add('filled');
        draggedElement.style.display = 'none';
    }
}

function eng_handleDropBank(e) {
    e.preventDefault();
    const eng_dropZone = document.getElementById('eng_word-bank');
    const draggedElement = document.querySelector('.dragging');
    
    if (draggedElement) {
        if(draggedElement.classList.contains('blank-space')) {
            draggedElement.textContent = '';
            draggedElement.classList.remove('filled');
            const newTile = eng_createWordTile(draggedElement.dataset.answer);
            eng_dropZone.appendChild(newTile);
            eng_setupDragAndDrop();
        } else if(draggedElement.classList.contains('word-tile')) {
            eng_dropZone.appendChild(draggedElement);
            draggedElement.classList.remove('placed');
        }
    }
}

function eng_checkAnswer() {
    let isCorrect = false;
    if (currentMode === 'version1') {
        isCorrect = eng_checkVersion1Answer();
    } else {
        isCorrect = eng_checkVersion2_3Answer();
    }
    
    if (isCorrect) {
        eng_resultMessage.textContent = '정답입니다! 🎉';
        eng_resultMessage.style.color = '#48bb78';
        
        setTimeout(() => {
            eng_loadNewSentence();
        }, 2000);

    } else {
        wrongAttempts++;
        eng_resultMessage.textContent = `아쉽지만 다시 시도해보세요. (오답 횟수: ${wrongAttempts}회) 🤔`;
        eng_resultMessage.style.color = '#f56565';
        
        if (wrongAttempts >= 3) {
            eng_resultMessage.innerHTML += `<p class="correct-answer-text">정답: ${originalSentence.join(' ')}</p>`;
        }
    }
}

function eng_checkVersion1Answer() {
    const blanks = document.querySelectorAll('.blank-space');
    let allCorrect = true;
    blanks.forEach(blank => {
        if (blank.textContent.trim() !== blank.dataset.answer.trim()) {
            allCorrect = false;
        }
    });
    return allCorrect;
}

function eng_checkVersion2_3Answer() {
    const orderedWords = Array.from(document.getElementById('eng_word-order').children).map(tile => tile.textContent);
    
    if (orderedWords.length !== originalSentence.length) {
        return false;
    }
    
    for (let i = 0; i < orderedWords.length; i++) {
        if (orderedWords[i] !== originalSentence[i]) {
            return false;
        }
    }
    return true;
}

function eng_shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

eng_loadDataAndSetupMenu();