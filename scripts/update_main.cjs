const fs = require('fs');
let content = fs.readFileSync('src/main.js', 'utf8');

// 1. Update speak method
content = content.replace(
    /speak\(text, lang = 'zh-CN'\) \{/,
    `speak(text, lang = 'zh-CN') {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.speak) {
      window.webkit.messageHandlers.speak.postMessage({text: text, lang: lang});
      return;
    }`
);

// 2. Update renderLearn method
content = content.replace(
    /<h3>リスニング<\/h3>\s*<p style="color: var\(--text-light\); font-size: 0\.9rem; margin-bottom: 12px;">耳を鍛える早押しゲーム！<\/p>/,
    `<h3>リスニング（会話）</h3>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 12px;">会話例から音声を聴いて意味を選ぼう！</p>`
);
content = content.replace(
    /<h3>スピーキング<\/h3>\s*<p style="color: var\(--text-light\); font-size: 0\.9rem; margin-bottom: 12px;">声に出して発音チェック！<\/p>/,
    `<h3>スピーキング（会話）</h3>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 12px;">会話文を声に出して発音チェック！</p>`
);
content = content.replace(
    /<\/button>\n\s*<\/div>\n\s*`;\n\s*this\.mainEl\.innerHTML = html;/,
    `</button>
      </div>
      
      <div class="card-outline" style="text-align: center; padding: 24px 16px;">
          <h3>並び替えパズル</h3>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 12px;">単語を正しい順番に並べて文章を作ろう！</p>
          <button class="btn-primary" style="width: 100%; background: #4CAF50; box-shadow: 0 4px 0 #388E3C;" onclick="location.hash='#/quiz/sorting'">開始</button>
      </div>
      \`;
    this.mainEl.innerHTML = html;`
);

// 3. Replace from renderQuiz down to the end of the class
const renderQuizIndex = content.indexOf('  renderQuiz(type) {');
const footerIndex = content.indexOf("// Initialize App");

const beforeQuiz = content.substring(0, renderQuizIndex);
const newQuizLogic = `  renderQuiz(type) {
    if (phrasesData.length < 4) {
      this.mainEl.innerHTML = '<p style="text-align:center; padding: 20px;">フレーズデータが不足しています。</p>';
      return;
    }
    this.quizType = type;
    this.currentQuizScore = 0;
    this.currentQuizQuestion = 1;
    this.totalQuizQuestions = 5;
    this.nextQuizQuestion();
  }

  getRandomExampleSentence() {
      const phrasesWithExamples = phrasesData.filter(p => p.example && p.example.length > 0);
      if (phrasesWithExamples.length === 0) return phrasesData[Math.floor(Math.random() * phrasesData.length)];
      
      const phrase = phrasesWithExamples[Math.floor(Math.random() * phrasesWithExamples.length)];
      const line = phrase.example[Math.floor(Math.random() * phrase.example.length)];
      return {
          id: phrase.id + '-' + Math.random(),
          chinese: line.chinese,
          japanese: line.japanese,
          pinyin: phrase.pinyin
      };
  }

  nextQuizQuestion() {
    if (this.currentQuizQuestion > this.totalQuizQuestions) {
      this.renderQuizResult();
      return;
    }

    const target = this.getRandomExampleSentence();
    this.currentQuizTarget = target;

    let html = \`
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <span class="material-icons" style="cursor:pointer; font-size: 32px; color: var(--text-muted);" onclick="history.back()">close</span>
        <div style="font-weight: bold; color: var(--text-light);">問題 \${this.currentQuizQuestion} / \${this.totalQuizQuestions}</div>
        <div style="width: 32px;"></div>
      </div>
    \`;

    if (this.quizType === 'listening') {
      let options = [target];
      while (options.length < 4) {
        let rnd = this.getRandomExampleSentence();
        if (!options.find(o => o.japanese === rnd.japanese)) options.push(rnd);
      }
      options = options.sort(() => Math.random() - 0.5);

      html += \`
          <div style="text-align: center; margin-bottom: 40px; margin-top: 40px;">
              <button class="btn-primary" style="width: 80px; height: 80px; border-radius: 50%; box-shadow: 0 6px 0 #0288D1;" onclick="window.app.speak('\${target.chinese.replace(/'/g, "\\\\'")}')">
                  <span class="material-icons" style="font-size: 40px;">volume_up</span>
              </button>
              <p style="margin-top: 20px; color: var(--text-muted); font-weight: bold;">会話の音声を聴いて正しい意味を選んでください</p>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;" id="quiz-options">
              \${options.map((opt, i) => \`
                  <button class="card-outline" style="text-align: left; padding: 16px; border: 2px solid #EEE;" onclick="window.app.handleListeningAnswer('\${opt.japanese.replace(/'/g, "\\\\'")}')">
                      <span style="font-weight: bold;">\${i + 1}.</span> \${opt.japanese}
                  </button>
              \`).join('')}
          </div>
        \`;
      setTimeout(() => this.speak(target.chinese), 500);

    } else if (this.quizType === 'speaking') {
      html += \`
          <div style="text-align: center; margin-bottom: 20px; margin-top: 20px;">
              <p style="color: var(--text-light); margin-bottom: 8px;">次の会話文を中国語で話してください</p>
              <h2 style="font-size: 1.5rem; margin-bottom: 24px;">\${target.japanese}</h2>
          </div>
          <div style="text-align: center; margin-top: 40px;">
              <button id="mic-btn" class="btn-primary" style="width: 100px; height: 100px; border-radius: 50%; background: #FF9800; box-shadow: 0 6px 0 #F57C00;" onclick="window.app.startSpeechRecognition()">
                  <span class="material-icons" id="mic-icon" style="font-size: 50px;">mic</span>
              </button>
              <div id="speech-result" style="margin-top: 20px; min-height: 24px; font-weight: bold; font-size: 1.1rem; color: var(--text-main);" class="zh"></div>
              <div id="speech-evaluation" style="margin-top: 10px; font-size: 0.9rem; color: var(--text-light); word-break: break-all;"></div>
              <button id="next-btn" class="btn-primary" style="display: none; width: 100%; margin-top: 30px;" onclick="window.app.handleSpeechNext()">次へ</button>
          </div>
        \`;
    } else if (this.quizType === 'sorting') {
      const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
      const words = Array.from(segmenter.segment(target.chinese))
                         .filter(s => s.isWordLike || s.segment.trim().length > 0)
                         .map(s => s.segment.trim())
                         .filter(s => s && !/[.,!?。，！？]/.test(s));
      let shuffled = [...words].sort(() => Math.random() - 0.5);
      
      this.sortingTargetWords = words;
      this.sortingSelectedWords = [];
      this.sortingAvailableWords = shuffled;

      html += \`
          <div style="text-align: center; margin-bottom: 20px; margin-top: 20px;">
              <p style="color: var(--text-light); margin-bottom: 8px;">正しい順番に並び替えてください</p>
              <h2 style="font-size: 1.3rem; margin-bottom: 24px;">\${target.japanese}</h2>
          </div>
          <div id="sort-answer-area" style="min-height: 60px; border-bottom: 2px solid #ccc; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 8px; align-items: flex-end;"></div>
          <div id="sort-options-area" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;"></div>
          <button id="sort-check-btn" class="btn-primary" style="width: 100%; margin-top: 30px; display: none;" onclick="window.app.checkSortingAnswer()">判定する</button>
          <button id="next-btn" class="btn-primary" style="display: none; width: 100%; margin-top: 30px;" onclick="window.app.handleSpeechNext()">次へ</button>
      \`;
      this.mainEl.innerHTML = html;
      this.renderSortingOptions();
      return;
    }
    this.mainEl.innerHTML = html;
  }

  renderSortingOptions() {
      const ansArea = document.getElementById('sort-answer-area');
      const optArea = document.getElementById('sort-options-area');
      const checkBtn = document.getElementById('sort-check-btn');
      
      ansArea.innerHTML = this.sortingSelectedWords.map((w, idx) => \`
          <span class="badge" style="background:#E3F2FD; color:#0288D1; font-size:1.1rem; padding: 8px 16px; cursor:pointer;" onclick="window.app.removeSortingWord(\${idx})">\${w}</span>
      \`).join('');
      
      optArea.innerHTML = this.sortingAvailableWords.map((w, idx) => \`
          <span class="badge" style="background:#FFF; border: 1px solid #CCC; color:#333; font-size:1.1rem; padding: 8px 16px; cursor:pointer;" onclick="window.app.addSortingWord(\${idx})">\${w}</span>
      \`).join('');
      
      if (this.sortingSelectedWords.length === this.sortingTargetWords.length) {
          checkBtn.style.display = 'block';
      } else {
          checkBtn.style.display = 'none';
      }
  }

  addSortingWord(idx) {
      const w = this.sortingAvailableWords.splice(idx, 1)[0];
      this.sortingSelectedWords.push(w);
      this.renderSortingOptions();
  }

  removeSortingWord(idx) {
      const w = this.sortingSelectedWords.splice(idx, 1)[0];
      this.sortingAvailableWords.push(w);
      this.renderSortingOptions();
  }

  checkSortingAnswer() {
      const userAnswer = this.sortingSelectedWords.join('');
      const targetAnswer = this.sortingTargetWords.join('');
      const checkBtn = document.getElementById('sort-check-btn');
      const nextBtn = document.getElementById('next-btn');
      const ansArea = document.getElementById('sort-answer-area');
      
      document.getElementById('sort-options-area').innerHTML = '';
      checkBtn.style.display = 'none';
      nextBtn.style.display = 'block';
      
      if (userAnswer === targetAnswer) {
          ansArea.style.borderBottomColor = '#4CAF50';
          this.speak('答对了', 'zh-CN');
          this.currentQuizScore++;
      } else {
          ansArea.style.borderBottomColor = '#F44336';
          ansArea.innerHTML += '<div style="width:100%; color:#F44336; margin-top:8px; font-size:0.9rem;">正解: ' + targetAnswer + '</div>';
          this.speak('写错了', 'zh-CN');
      }
  }

  handleListeningAnswer(selectedText) {
    const isCorrect = selectedText === this.currentQuizTarget.japanese;
    const optionsDiv = document.getElementById('quiz-options');
    const buttons = optionsDiv.querySelectorAll('button');

    buttons.forEach(btn => {
      btn.onclick = null;
      if (btn.innerText.includes(this.currentQuizTarget.japanese)) {
        btn.style.borderColor = '#4CAF50';
        btn.style.backgroundColor = '#E8F5E9';
      } else if (btn.innerText.includes(selectedText) && !isCorrect) {
        btn.style.borderColor = '#F44336';
        btn.style.backgroundColor = '#FFEBEE';
      }
    });

    if (isCorrect) {
      this.currentQuizScore++;
      this.speak('答对了', 'zh-CN');
    } else {
      this.speak('写错了', 'zh-CN');
    }

    setTimeout(() => {
      this.currentQuizQuestion++;
      this.nextQuizQuestion();
    }, 1500);
  }

  evaluateSpeech(transcript, targetText) {
      const cleanT = transcript.replace(/[.,!?。，！？\\s]/g, '');
      const cleanTarget = targetText.replace(/[.,!?。，！？\\s]/g, '');
      
      if (cleanT === cleanTarget) {
          return { score: 100, stars: 3, msg: "完全一致！" };
      }
      
      const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
      const targetWords = Array.from(segmenter.segment(cleanTarget)).filter(s => s.isWordLike).map(s => s.segment);
      const userWords = Array.from(segmenter.segment(cleanT)).filter(s => s.isWordLike).map(s => s.segment);
      
      let matchedCount = 0;
      targetWords.forEach(tw => {
          if (userWords.includes(tw)) matchedCount++;
      });
      
      const ratio = targetWords.length > 0 ? (matchedCount / targetWords.length) : 0;
      const score = Math.round(ratio * 100);
      
      if (score >= 70) {
          return { score: score, stars: 2, msg: "部分一致！通じますが少し不自然な部分があります" };
      } else if (score >= 40) {
          return { score: score, stars: 1, msg: "惜しい！一部の単語は認識されました" };
      } else {
          return { score: score, stars: 0, msg: "不合格...別の言葉として認識されました" };
      }
  }

  startSpeechRecognition() {
    const micBtn = document.getElementById('mic-btn');
    const micIcon = document.getElementById('mic-icon');
    const resultText = document.getElementById('speech-result');
    const evalText = document.getElementById('speech-evaluation');

    micBtn.style.animation = 'pulse 1s infinite alternate';
    micBtn.style.background = '#F44336';
    micIcon.textContent = 'mic_none';
    resultText.innerHTML = '聞いています...';
    evalText.innerHTML = '';

    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.recognizeSpeech) {
      window.webkit.messageHandlers.recognizeSpeech.postMessage({lang: 'zh-CN'});
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.resetMicBtn();
      resultText.innerHTML = 'ブラウザが音声認識に非対応です。iOSならSafariを使用してください。';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.receiveSpeechResult(transcript);
    };

    recognition.onerror = (event) => {
      resultText.innerHTML = 'エラーが発生しました: ' + event.error;
      this.resetMicBtn();
    };

    recognition.onend = () => {
      this.resetMicBtn();
    };

    recognition.start();
  }

  receiveSpeechResult(transcript) {
      this.resetMicBtn();
      const resultText = document.getElementById('speech-result');
      const evalText = document.getElementById('speech-evaluation');
      const nextBtn = document.getElementById('next-btn');
      
      const targetChinese = this.currentQuizTarget.chinese;
      const evalData = this.evaluateSpeech(transcript, targetChinese);
      
      let starHtml = '';
      for(let i=0; i<3; i++) {
          starHtml += \`<span class="material-icons" style="color: \${i < evalData.stars ? '#FFC800' : '#CCCCCC'}; vertical-align: middle; font-size: 24px;">star</span>\`;
      }
      
      resultText.innerHTML = \`
        <div style="color: var(--text-main); font-weight: normal; font-size: 1rem; margin-bottom: 8px;">あなたの発音: "\${transcript}"</div>
        <div style="margin-top: 8px;">判定: \${evalData.score}点！ \${starHtml}</div>
      \`;
      
      if (evalData.stars === 3) {
          resultText.style.color = '#4CAF50';
          evalText.innerHTML = evalData.msg;
          this.currentQuizScore++;
      } else if (evalData.stars >= 1) {
          resultText.style.color = '#FF9800';
          evalText.innerHTML = \`\${evalData.msg}<br><span style="color:#F44336;">正解: \${targetChinese}</span>\`;
          if (evalData.stars === 2) this.currentQuizScore += 0.5;
      } else {
          resultText.style.color = '#F44336';
          evalText.innerHTML = \`\${evalData.msg}<br><span style="color:#F44336;">正解: \${targetChinese}</span>\`;
      }
      
      nextBtn.style.display = 'block';
      document.getElementById('mic-btn').style.display = 'none';
  }

  resetMicBtn() {
      const micBtn = document.getElementById('mic-btn');
      const micIcon = document.getElementById('mic-icon');
      if(micBtn) {
          micBtn.style.animation = 'none';
          micBtn.style.background = '#FF9800';
      }
      if(micIcon) micIcon.textContent = 'mic';
  }

  handleSpeechNext() {
    this.currentQuizQuestion++;
    this.nextQuizQuestion();
  }

  renderQuizResult() {
    let message = 'よく頑張りました！';
    if (this.currentQuizScore >= this.totalQuizQuestions * 0.8) message = '素晴らしい成績です！';
    else if (this.currentQuizScore >= this.totalQuizQuestions * 0.5) message = 'その調子です！';

    let html = \`
          <div style="text-align: center; margin-top: 60px;">
              <h2 style="font-size: 2rem; margin-bottom: 20px;">結果発表</h2>
              <div style="font-size: 4rem; font-weight: 800; color: #FF9800; margin-bottom: 20px;">
                  \${this.currentQuizScore} <span style="font-size: 2rem; color: var(--text-main);">/ \${this.totalQuizQuestions}</span>
              </div>
              <p style="font-size: 1.2rem; font-weight: bold; margin-bottom: 40px;">\${message}</p>
              
              <button class="btn-primary" style="width: 100%; margin-bottom: 16px;" onclick="location.hash='#/learn'">学習メニューに戻る</button>
              <button class="btn-secondary" style="width: 100%;" onclick="location.hash='#/'">ホームへ</button>
          </div>
      \`;
    this.mainEl.innerHTML = html;
  }
}
`;

const finalContent = beforeQuiz + newQuizLogic + '\n' + content.substring(footerIndex);

fs.writeFileSync('src/main.js', finalContent);
console.log('main.js updated successfully!');
