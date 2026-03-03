import './styles/index.css';
import categoriesData from './data/categories.json';
import { storage } from './services/storage.js';
import dictionaryData from './data/dictionary.json';

import phrasesData from './data/phrases.json';
import { pinyin } from 'pinyin-pro';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Simple Router
class App {
  constructor() {
    this.appEl = document.getElementById('app');
    this.audioTimers = []; // Track scheduled audio
    this.isRecognizing = false;
    this.init();
    window.addEventListener('hashchange', () => this.route());

    // Swipe Navigation Props
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.isLongPress = false;
    this.longPressThreshold = 250; // ms
    this.swipeThreshold = 50; // px

    this.setupSwipeNavigation();
  }

  setupSwipeNavigation() {
    const navOrder = ['nav-home', 'nav-learn', 'nav-search', 'nav-dashboard', 'nav-settings'];
    const hashes = ['#/', '#/learn', '#/search', '#/dashboard', '#/settings'];

    document.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.touchStartTime = Date.now();
      this.isLongPress = false;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchDuration = Date.now() - this.touchStartTime;

      if (touchDuration >= this.longPressThreshold) {
        const diffX = touchEndX - this.touchStartX;
        const diffY = touchEndY - this.touchStartY;

        // Ensure it's mostly horizontal
        if (Math.abs(diffX) > this.swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
          const currentHash = window.location.hash || '#/';
          let currentIndex = hashes.indexOf(currentHash);
          if (currentIndex === -1) return; // Not on a main tab

          if (diffX > 0) {
            // Swipe Right -> Go Left in nav
            if (currentIndex > 0) {
              window.location.hash = hashes[currentIndex - 1];
              this.triggerHaptic('selection');
            }
          } else {
            // Swipe Left -> Go Right in nav
            if (currentIndex < hashes.length - 1) {
              window.location.hash = hashes[currentIndex + 1];
              this.triggerHaptic('selection');
            }
          }
        }
      }
    }, { passive: true });
  }

  init() {
    this.showSplash();
    this.speechRate = localStorage.getItem('speech_rate') || 1.0;
    this.renderLayout();
    this.route();

    // Auto-hide splash after a short delay
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) splash.classList.add('fade-out');
    }, 1200);
  }

  showSplash() {
    // Already in HTML, handled by init
  }

  async triggerHaptic(type = 'success') {
    try {
      if (type === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (type === 'error') {
        await Haptics.notification({ type: NotificationType.Error });
      } else if (type === 'selection') {
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
      } else {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
    } catch (e) {
      // Ignore if not in a native context
    }
  }

  stopAudio() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Clear scheduled audio triggers
    this.audioTimers.forEach(timer => clearTimeout(timer));
    this.audioTimers = [];

    // Notify native bridges to stop audio/speech
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stopAudio' }));
    }
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.stopAudio) {
      window.webkit.messageHandlers.stopAudio.postMessage({});
    }
  }

  playSound(type) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playSound', style: type }));
      return;
    }
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.playSound) {
      window.webkit.messageHandlers.playSound.postMessage({ type });
      return;
    }

    // Web Audio API Fallback
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'error') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(110, now); // A2
        osc.frequency.linearRampToValueAtTime(55, now + 0.2); // A1
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.error('Audio error:', e);
    }
  }

  showAchievement(id) {
    const overlay = document.getElementById('achievement-overlay');
    const img = document.getElementById('achievement-img');
    const title = document.getElementById('achievement-title');
    const desc = document.getElementById('achievement-desc');

    if (id === '100_phrases') {
      img.src = '/img/badges/100_phrases.png';
      title.textContent = '100フレーズ達成！';
      desc.textContent = 'すごい！100個のフレーズを学習しました。あなたはもう初級脱出です！';
    } else if (id === 'perfect_score') {
      img.src = '/img/badges/perfect_score.png';
      title.textContent = '満点合格！';
      desc.textContent = '素晴らしい！クイズで全問正解しました。パンダ先生も感激しています！';
    }

    overlay.classList.remove('hidden');
    this.triggerHaptic('success');
  }

  renderLayout() {
    const stats = storage.getStats();
    const favCount = storage.getFavorites().length;

    const isAdFree = storage.isAdFree();
    if (!isAdFree) {
      document.body.classList.add('has-ad');
    } else {
      document.body.classList.remove('has-ad');
    }

    const bannerHtml = isAdFree ? '' : `
      <div class="ad-banner" id="native-ad-placeholder"></div>
    `;

    document.body.innerHTML = `
      <header id="app-header">
        <div class="header-top">
          <div class="logo-area" onclick="location.hash='#/'">
            <img src="/img/logo.png" alt="みんなの中国語" style="height: 32px; width: 32px; border-radius: 6px;" />
            <h1>みんなの中国語</h1>
          </div>
          <div class="stats-badges">
            <div class="badge badge-fire">
              <span class="material-icons" style="font-size:16px">local_fire_department</span> <span id="badge-streak">${storage.getStudiedTodayIds().length}</span>
            </div>
            <div class="badge badge-heart">
              <span class="material-icons" style="font-size:16px">school</span> <span id="badge-review">${storage.getReviewedCount()}</span>
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 4px 0; cursor: pointer;" onclick="location.hash='#/search'">
          <span class="material-icons" style="color: var(--text-main); font-size: 1.2rem;">search</span>
          <h2 style="font-size: 1.1rem; color: var(--text-main); font-weight: 700; margin: 0;">フレーズを検索</h2>
        </div>
      </header>
      <main id="main-content" class="animate-fade-in"></main>
      ${bannerHtml}
      <nav class="bottom-nav">
        <a href="#/" class="nav-item active" id="nav-home">
          <div class="icon-wrapper"><span class="material-icons">home</span></div>
          <span>ホーム</span>
        </a>
        <a href="#/learn" class="nav-item" id="nav-learn">
          <div class="icon-wrapper"><span class="material-icons">school</span></div>
          <span>学習</span>
        </a>
        <a href="#/search" class="nav-item" id="nav-search" onclick="location.hash='#/search'">
          <div class="icon-wrapper"><span class="material-icons">search</span></div>
          <span>検索</span>
        </a>
        <a href="#/dashboard" class="nav-item" id="nav-dashboard">
          <div class="icon-wrapper"><span class="material-icons">insert_chart</span></div>
          <span>進捗</span>
        </a>
        <a href="#/settings" class="nav-item" id="nav-settings">
          <div class="icon-wrapper"><span class="material-icons">settings</span></div>
          <span>設定</span>
        </a>
      </nav>
    `;
    this.mainEl = document.getElementById('main-content');
    this.headerEl = document.getElementById('app-header');
  }

  updateHeaderBadges() {
    const streakEl = document.getElementById('badge-streak');
    const reviewEl = document.getElementById('badge-review');
    if (streakEl) streakEl.textContent = storage.getStudiedTodayIds().length;
    if (reviewEl) reviewEl.textContent = storage.getReviewedCount();
  }

  updateNav(activeId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(activeId);
    if (activeEl) activeEl.classList.add('active');
  }

  route() {
    const hash = window.location.hash || '#/';
    this.mainEl.innerHTML = ''; // Clear current
    this.mainEl.classList.remove('animate-fade-in');
    void this.mainEl.offsetWidth; // Trigger reflow
    this.mainEl.classList.add('animate-fade-in');

    // Stop common audio when navigating
    this.stopAudio();

    // Update header badges on every route change
    this.updateHeaderBadges();

    // Show/hide main header depending on route
    if (hash.startsWith('#/phrase/') || hash.startsWith('#/quiz/')) {
      this.headerEl.style.display = 'none';
      this.mainEl.style.paddingTop = '16px';
    } else {
      this.headerEl.style.display = 'flex';
      this.mainEl.style.paddingTop = '20px';
    }

    // Ensure bottom padding for all pages to clear ads/nav
    this.mainEl.style.paddingBottom = '120px';

    if (hash === '#/') {
      this.updateNav('nav-home');
      this.renderHome();
    } else if (hash === '#/learn') {
      this.updateNav('nav-learn');
      this.renderLearn();
    } else if (hash === '#/search') {
      this.updateNav('nav-search');
      this.renderSearch();
    } else if (hash === '#/dashboard') {
      this.updateNav('nav-dashboard');
      this.renderDashboard();
    } else if (hash === '#/settings') {
      this.updateNav('nav-settings');
      this.renderSettings();
    } else if (hash.startsWith('#/quiz-select/')) {
      this.updateNav('nav-learn');
      const source = hash.split('/')[2];
      this.renderQuizSelect(source);
    } else if (hash.startsWith('#/category/')) {
      const catId = hash.split('/')[2];
      this.renderCategory(catId);
    } else if (hash.startsWith('#/phrase/')) {
      const phraseId = hash.split('/')[2];
      this.renderPhrase(phraseId);
    } else if (hash.startsWith('#/quiz/')) {
      this.headerEl.style.display = 'none';
      const quizType = hash.split('/')[2];
      this.renderQuiz(quizType);
    } else {
      this.mainEl.innerHTML = '<div style="text-align: center; margin-top: 50px; color: var(--text-muted);">機能開発中...</div>';
    }
  }

  handleWordStart(e, el) {
    this.longPressTriggered = false;
    this.longPressTimer = setTimeout(() => {
      this.longPressTriggered = true;
      this.showTrans(el);
    }, 400);
  }

  handleWordEnd(e) {
    clearTimeout(this.longPressTimer);
    if (this.longPressTriggered) {
      if (e) e.stopPropagation();
      setTimeout(() => this.hideTrans(), 1500);
    }
  }

  showTrans(el) {
    let tooltip = document.getElementById('word-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'word-tooltip';
      document.body.appendChild(tooltip);
    }
    tooltip.textContent = el.getAttribute('data-trans');
    tooltip.classList.add('show');
    const rect = el.getBoundingClientRect();
    tooltip.style.left = Math.max(10, rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';
    tooltip.style.top = (rect.top - 45) + 'px';
  }

  hideTrans() {
    const tooltip = document.getElementById('word-tooltip');
    if (tooltip) tooltip.classList.remove('show');
  }

  speakBubble(e, text) {
    if (this.longPressTriggered) {
      this.longPressTriggered = false;
      return;
    }
    this.speak(text);
  }

  renderSegmentedChinese(text) {
    try {
      const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
      const segments = segmenter.segment(text);
      let html = '';
      for (const { segment, isWordLike } of segments) {
        if (isWordLike && dictionaryData[segment]) {
          html += `<span class="word-trans" data-trans="${dictionaryData[segment]}" onmousedown="window.app.handleWordStart(event, this)" ontouchstart="window.app.handleWordStart(event, this)" onmouseup="window.app.handleWordEnd(event)" ontouchend="window.app.handleWordEnd(event)" onmouseleave="window.app.handleWordEnd(event)">${segment}</span>`;
        } else {
          html += segment;
        }
      }
      return html;
    } catch (e) {
      return text;
    }
  }

  speak(text, lang = 'zh-CN') {
    // Check for native TTS bridge
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'speak', text, lang, rate: parseFloat(this.speechRate) }));
      return;
    }
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.speak) {
      window.webkit.messageHandlers.speak.postMessage({ text: text, lang: lang, rate: parseFloat(this.speechRate) });
      return;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance();
      msg.text = text;
      msg.lang = lang;
      msg.rate = parseFloat(this.speechRate) || 0.85;
      this.stopAudio(); // Ensure nothing else is playing
      window.speechSynthesis.speak(msg);
    } else {
      alert("お使いのブラウザは音声再生に対応していません。");
    }
  }

  getAvatarHtml(avatar, expression, size = 44) {
    const pngPath = `/icons/${avatar}_${expression}.png`;
    const svgPath = `/icons/${avatar}_${expression}.svg`;
    return `<img src="${pngPath}" alt="${avatar}" onerror="this.onerror=null;this.src='${svgPath}'" style="width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; flex-shrink:0; background:#2196F3;" />`;
  }

  renderHome() {
    // Pick 5 random unstudied phrases for "Today's Phrases"
    const studiedAll = storage.getAllStudiedIds();
    let unstudiedPhrases = phrasesData.filter(p => !studiedAll.includes(p.id));
    // Shuffle
    unstudiedPhrases = unstudiedPhrases.sort(() => Math.random() - 0.5);
    let todaysPhrases = unstudiedPhrases.slice(0, 5);
    // Fill with studied if not enough unstudied
    if (todaysPhrases.length < 5) {
      let studiedPhrases = phrasesData.filter(p => studiedAll.includes(p.id)).sort(() => Math.random() - 0.5);
      todaysPhrases = todaysPhrases.concat(studiedPhrases.slice(0, 5 - todaysPhrases.length));
    }

    const favCount = storage.getFavorites().length;

    const stats = storage.getStats();
    let streakHtml = '';
    if (stats.streak > 0) {
      streakHtml = `
        <div class="streak-display">
          <span class="material-icons" style="font-size: 40px;">local_fire_department</span>
          <div>
            <div class="streak-count">${stats.streak}日目</div>
            <div class="streak-label">現在 ${stats.streak}日連続で学習中！<br>この調子で続けましょう。</div>
          </div>
        </div>
      `;
    }

    let html = `
      ${streakHtml}
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <h2 class="section-title">今日のフレーズ</h2>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 32px;">
    `;

    todaysPhrases.forEach(phrase => {
      const isFav = storage.isFavorite(phrase.id);
      const starIcon = isFav ? 'star' : 'star_border';
      const starColor = isFav ? '#FFC800' : 'var(--text-muted)';

      html += `
        <div class="card-outline" onclick="location.hash='#/phrase/${phrase.id}'" style="padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
              <p class="zh" style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">${phrase.chinese}</p>
              <p style="color: var(--text-light); font-size: 0.9rem;">${phrase.japanese}</p>
          </div>
          <span class="material-icons fav-btn-${phrase.id}" style="color: ${starColor}; font-size: 28px; padding: 8px;" onclick="event.stopPropagation(); window.app.toggleFavList('${phrase.id}')">${starIcon}</span>
        </div>
      `;
    });

    html += `</div>

      <div class="card-outline card-row" onclick="location.hash='#/category/favorites'" style="border-color: #FFC800; background: #FFFDF0; margin-bottom: 32px;">
          <div class="icon-box" style="background: #FFC800;">
            <span class="material-icons">star</span>
          </div>
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 4px;">お気に入りフレーズ</h3>
            <p style="color: #8D6E24; font-size: 0.85rem;">保存したフレーズ: ${favCount}件</p>
          </div>
      </div>

      <h2 class="section-title">カテゴリー</h2>
      <div style="display: flex; flex-direction: column; gap: var(--space-xs);">
    `;

    // Map your JSON categories to the new UI colors/icons
    const iconMap = {
      'greeting': { bg: 'icon-red', icon: 'waving_hand', label: '挨拶・自己紹介' },
      'restaurant': { bg: 'icon-yellow', icon: 'restaurant', label: '注文・レストラン会話' },
      'shopping': { bg: 'icon-purple', icon: 'shopping_bag', label: '買い物・交渉' },
      'travel': { bg: 'icon-blue', icon: 'flight_takeoff', label: '交通・ホテル・道案内' },
      'business': { bg: 'icon-blue', icon: 'business_center', label: '会議・メール・交渉' },
      'daily': { bg: 'icon-green', icon: 'chat', label: '日常で使うフレーズ' },
      'emotion': { bg: 'icon-purple', icon: 'mood', label: '感情・気持ちを伝える' },
      'transport': { bg: 'icon-blue', icon: 'directions_transit', label: '移動・交通' },
      'health': { bg: 'icon-red', icon: 'local_hospital', label: '体調・病院' },

      'digital': { bg: 'icon-blue', icon: 'smartphone', label: 'デジタル・ネット' },
      'fashion': { bg: 'icon-purple', icon: 'checkroom', label: 'ファッション・美容' },
      'hobby': { bg: 'icon-green', icon: 'sports_esports', label: '趣味・娯楽' },
      'housing': { bg: 'icon-yellow', icon: 'home', label: '住宅・引越し' },
      'idiom': { bg: 'icon-red', icon: 'auto_stories', label: '成語・慣用句' },
      'money': { bg: 'icon-green', icon: 'account_balance', label: 'お金・金融' },
      'nature': { bg: 'icon-green', icon: 'park', label: '自然・動物' },
      'politics': { bg: 'icon-blue', icon: 'gavel', label: '政治・ニュース' },
      'slang': { bg: 'icon-red', icon: 'whatshot', label: 'スラング・ネット用語' },
      'social': { bg: 'icon-purple', icon: 'groups', label: 'SNS・社交' },
      'society': { bg: 'icon-yellow', icon: 'public', label: '社会問題' },
      'tech': { bg: 'icon-blue', icon: 'computer', label: 'テクノロジー' }
    };

    categoriesData.forEach((cat, idx) => {
      const mapping = iconMap[cat.id] || { bg: 'icon-blue', icon: 'folder', label: cat.description || '基本フレーズ' };
      const phraseCount = phrasesData.filter(p => p.category === cat.id).length;
      html += `
        <div class="card-outline card-row" onclick="location.hash='#/category/${cat.id}'">
          <div class="icon-box ${mapping.bg}">
            <span class="material-icons">${mapping.icon}</span>
          </div>
          <div style="flex: 1;">
            <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 4px;">${cat.name}</h3>
            <p style="color: var(--text-light); font-size: 0.85rem;">${mapping.label}</p>
          </div>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;">${phraseCount}語</span>
        </div>
      `;
    });

    html += `</div>`;
    this.mainEl.innerHTML = html;
  }

  renderCategory(catId) {
    let catName = 'カテゴリー';
    let phrases = [];

    if (catId === 'favorites') {
      catName = 'お気に入り';
      const favIds = storage.getFavorites();
      phrases = phrasesData.filter(p => favIds.includes(p.id));
    } else {
      const cat = categoriesData.find(c => c.id === catId);
      if (cat) catName = cat.name;
      phrases = phrasesData.filter(p => p.category === catId);
    }

    let html = `
      <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg);">
        <span class="material-icons" style="cursor:pointer; font-size: 30px; color: var(--text-muted);" onclick="history.back()">chevron_left</span>
        <h2 style="font-size: 1.3rem; font-weight: 800;">${catName}</h2>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        `;

    if (phrases.length === 0) {
      if (catId === 'favorites') {
        html += `<p style="text-align: center; color: var(--text-muted); margin-top: 40px;">お気に入りのフレーズがありません</p>`;
      } else {
        html += `<p style="text-align: center; color: var(--text-muted); margin-top: 40px;">準備中...</p>`;
      }
    } else {
      phrases.slice(0, 50).forEach(phrase => { // Display up to 50 items
        const isFav = storage.isFavorite(phrase.id);
        const starIcon = isFav ? 'star' : 'star_border';
        const starColor = isFav ? '#FFC800' : 'var(--text-muted)';

        html += `
          <div class="card-outline" onclick="location.hash='#/phrase/${phrase.id}'" style="padding: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
                <p class="zh" style="font-size: 1.2rem; font-weight: 700; margin-bottom: 4px;">${phrase.chinese}</p>
                <p style="color: var(--text-light); font-size: 0.9rem;">${phrase.japanese}</p>
            </div>
            <span class="material-icons fav-btn-${phrase.id}" style="color: ${starColor}; font-size: 28px; padding: 8px;" onclick="event.stopPropagation(); window.app.toggleFavList('${phrase.id}')">${starIcon}</span>
          </div>
        `;
      });
    }

    html += `</div>`;
    this.mainEl.innerHTML = html;
  }

  renderLearn() {
    const studiedAll = storage.getAllStudiedIds();
    const studiedToday = storage.getStudiedTodayIds();

    let html = `
      <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg);">
        <span class="material-icons" style="cursor:pointer; font-size: 30px; color: var(--text-muted);" onclick="history.back()">chevron_left</span>
        <h2 style="font-size: 1.3rem; font-weight: 800; text-align:center; flex:1; margin-right: 30px;">学習モード</h2>
      </div>

      <div style="background: #E1F5FE; border-radius: 12px; padding: 8px; text-align: center; font-weight: 700; color: #0288D1; margin-bottom: 24px;">
          ★ フレーズの出題元を選ぼう ★
          <p style="font-size: 0.8rem; font-weight: 400; margin-top:2px;">出題するフレーズの範囲を選んでください</p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;">

        <div class="card-outline card-row" onclick="location.hash='#/quiz-select/random'" style="padding: 16px; border-color: var(--primary);">
          <div class="icon-box icon-green" style="width: 48px; height: 48px; border-radius: 12px;">
            <span class="material-icons" style="font-size: 24px;">shuffle</span>
          </div>
          <div style="flex: 1;">
            <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 2px;">ランダム</h3>
            <p style="color: var(--text-light); font-size: 0.8rem;">全フレーズからランダムに出題</p>
          </div>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;">${phrasesData.length}語</span>
        </div>

        <div class="card-outline card-row" onclick="${studiedAll.length >= 4 ? `location.hash='#/quiz-select/studied'` : `alert('まだ学習したフレーズがありません。先にフレーズを勉強しましょう！')`}" style="padding: 16px; ${studiedAll.length < 4 ? 'opacity: 0.5;' : ''}">
          <div class="icon-box icon-blue" style="width: 48px; height: 48px; border-radius: 12px;">
            <span class="material-icons" style="font-size: 24px;">history</span>
          </div>
          <div style="flex: 1;">
            <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 2px;">今までやったもの</h3>
            <p style="color: var(--text-light); font-size: 0.8rem;">忘れたころにもう一回！間違えたものは繰り返し出題</p>
          </div>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;">${studiedAll.length}語</span>
        </div>

        <div class="card-outline card-row" onclick="${studiedToday.length >= 4 ? `location.hash='#/quiz-select/today'` : `alert('今日はまだフレーズを学習していません。先にフレーズを勉強しましょう！')`}" style="padding: 16px; ${studiedToday.length < 4 ? 'opacity: 0.5;' : ''}">
          <div class="icon-box" style="width: 48px; height: 48px; border-radius: 12px; background: #FF9800;">
            <span class="material-icons" style="font-size: 24px;">today</span>
          </div>
          <div style="flex: 1;">
            <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 2px;">今日やったもの</h3>
            <p style="color: var(--text-light); font-size: 0.8rem;">今日学習したフレーズから出題</p>
          </div>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;">${studiedToday.length}語</span>
        </div>

      <div style="height: 100px;"></div>
    `;
    this.mainEl.innerHTML = html;
  }

  renderResultArea(target, isCorrect) {
    const parent = document.getElementById('app');
    let resArea = document.getElementById('quiz-result-area');
    if (!resArea) {
      resArea = document.createElement('div');
      resArea.id = 'quiz-result-area';
      resArea.className = 'animate-fade-in';
      resArea.style.marginTop = '24px';
      this.mainEl.appendChild(resArea);
    }

    const phrase = phrasesData.find(p => p.id === target.id) || target;
    const isFav = storage.isFavorite(phrase.id);
    const starIcon = isFav ? 'star' : 'star_border';
    const starColor = isFav ? '#FFC800' : 'var(--text-muted)';

    const bgColor = isCorrect ? '#F1F8E9' : '#FFEBEE';
    const borderColor = isCorrect ? '#4CAF50' : '#F44336';

    resArea.innerHTML = `
      <div class="card-outline" style="border-color: ${borderColor}; background: ${bgColor}; padding: 0; cursor: default; overflow: hidden;">
        <div class="sticky-feedback-header" style="background: ${bgColor}; padding: 16px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <h3 style="color: ${isCorrect ? '#2E7D32' : '#C62828'}; margin: 0; flex-grow: 1;">${isCorrect ? '正解！' : '惜しい！'}</h3>
            <button class="btn-secondary" style="padding: 8px 12px; height: 40px; border-radius: 12px; box-shadow: 0 2px 0 var(--border-color);" onclick="window.app.speak('${phrase.chinese.replace(/'/g, "\\'")}')">
              <span class="material-icons">volume_up</span>
            </button>
            <button class="btn-primary" style="padding: 8px 24px; height: 40px; box-shadow: 0 2px 0 var(--primary-hover);" onclick="window.app.handleManualNext()">次へ進む</button>
          </div>
        </div>
        <div style="padding: 0 20px 20px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div style="flex: 1;">
              <p class="zh" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 4px;">${phrase.chinese}</p>
              <p style="color: var(--text-light); font-size: 0.9rem;">${phrase.japanese}</p>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; margin-left:16px;" onclick="window.app.toggleFavQuiz('${phrase.id}')">
              <span class="material-icons" style="color: ${starColor}; font-size: 28px;" id="quiz-fav-icon">${starIcon}</span>
              <span style="font-size: 0.7rem; color: ${starColor}; font-weight: bold; margin-top: -2px;">お気に入り</span>
            </div>
          </div>

          ${phrase.example && phrase.example.length > 0 ? `
          <div style="margin-top: 16px; margin-bottom: 8px;">
            <h4 style="font-size: 0.9rem; font-weight: bold; color: var(--text-main); margin-bottom: 12px;">スクリプト（会話例）</h4>
            <div class="chat-container">
                ${phrase.example.map((ex, index) => {
      const isRight = index % 2 !== 0;
      const avatarHtml = this.getAvatarHtml(ex.avatar, ex.expression, 36);
      const targetChineseSafe = ex.chinese.replace(/'/g, "\\'");

      return `
                    <div style="display: flex; gap: 12px; align-items: flex-start; ${isRight ? 'flex-direction: row-reverse;' : ''}">
                        ${avatarHtml}
                        <div style="display: flex; flex-direction: column; align-items: ${isRight ? 'flex-end' : 'flex-start'}; max-width: 85%;">
                            <div class="chat-bubble ${isRight ? 'right' : 'left'}" onclick="window.app.speakBubble(event, '${targetChineseSafe}')" style="cursor: pointer; padding: 10px 14px;">
                                <p class="zh" style="font-size: 1.0rem; font-weight: 600; margin-bottom: 2px; ${isRight ? 'color: #0288D1;' : ''}">${this.renderSegmentedChinese(ex.chinese)} <span class="material-icons" style="font-size: 14px; color: ${isRight ? '#0288D1' : 'var(--text-muted)'}; vertical-align: middle;">volume_up</span></p>
                                <p style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 2px; font-family: 'Inter', sans-serif;">${pinyin(ex.chinese)}</p>
                                <p style="font-size: 0.75rem; color: var(--text-muted);">${ex.japanese}</p>
                            </div>
                        </div>
                    </div>
                  `;
    }).join('')}
            </div>
          </div>
          ` : ''
      }

          <div class="tips-box" style="margin-top: 20px; padding: 12px; background: rgba(255,255,255,0.5); border-color: rgba(0,0,0,0.05);">
        <div class="tips-badge" style="top: -10px; font-size: 0.7rem;">解説</div>
        <p style="font-size: 0.85rem; line-height: 1.5; color: #5c4d29;">
          ${phrase.notes || 'このフレーズをマスターしましょう！'}
        </p>
      </div>
        </div>
      </div>
      `;
    resArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  toggleFavQuiz(phraseId) {
    const isAdded = storage.toggleFavorite(phraseId);
    const icon = document.getElementById('quiz-fav-icon');
    if (icon) {
      icon.textContent = isAdded ? 'star' : 'star_border';
      icon.style.color = isAdded ? '#FFC800' : 'var(--text-muted)';
      icon.nextElementSibling.style.color = isAdded ? '#FFC800' : 'var(--text-muted)';
    }
  }

  handleManualNext() {
    this.stopAudio();
    if (!this.currentQuizIsRetry) this.currentQuizQuestion++;
    this.nextQuizQuestion();
  }

  renderQuizSelect(source) {
    this.quizSource = source;

    const sourceName = { random: 'ランダム', studied: '今までやったもの', today: '今日やったもの' }[source] || source;

    let html = `
      <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg);">
        <span class="material-icons" style="cursor:pointer; font-size: 30px; color: var(--text-muted);" onclick="location.hash='#/learn'">chevron_left</span>
        <h2 style="font-size: 1.3rem; font-weight: 800; text-align:center; flex:1; margin-right: 30px;">クイズ形式を選択</h2>
      </div>

      <div style="background: #E8F5E9; border-radius: 12px; padding: 10px 16px; text-align: center; font-weight: 700; color: #2E7D32; margin-bottom: 24px;">
          出題元: ${sourceName}
      </div>

      <div class="card-outline" style="text-align: center; padding: 24px 16px;">
          <span class="material-icons" style="font-size: 40px; color: #2196F3; margin-bottom: 8px;">headphones</span>
          <h3>リスニング（会話）</h3>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 12px;">会話例から音声を聴いて意味を選ぼう！</p>
          <button class="btn-primary" style="width: 100%;" onclick="location.hash='#/quiz/${source}_listening'">開始</button>
      </div>
      
      <div class="card-outline" style="text-align: center; padding: 24px 16px;">
          <span class="material-icons" style="font-size: 40px; color: #FF9800; margin-bottom: 8px;">mic</span>
          <h3>スピーキング（会話）</h3>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 12px;">会話文を声に出して発音チェック！</p>
          <button class="btn-primary" style="width: 100%; background: #FF9800; box-shadow: 0 4px 0 #F57C00;" onclick="location.hash='#/quiz/${source}_speaking'">開始</button>
      </div>
      
      <div class="card-outline" style="text-align: center; padding: 24px 16px;">
          <span class="material-icons" style="font-size: 40px; color: #4CAF50; margin-bottom: 8px;">sort</span>
          <h3>並び替えパズル</h3>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 12px;">単語を正しい順番に並べて文章を作ろう！</p>
          <button class="btn-primary" style="width: 100%; background: #4CAF50; box-shadow: 0 4px 0 #388E3C;" onclick="location.hash='#/quiz/${source}_sorting'">開始</button>
      </div>

      <div class="card-outline" style="text-align: center; padding: 24px 16px;">
          <span class="material-icons" style="font-size: 40px; color: #9C27B0; margin-bottom: 8px;">casino</span>
          <h3>ミックス</h3>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 12px;">全形式をランダムに出題！</p>
          <button class="btn-primary" style="width: 100%; background: #9C27B0; box-shadow: 0 4px 0 #7B1FA2;" onclick="location.hash='#/quiz/${source}_mix'">開始</button>
      </div>
      <div style="height: 100px;"></div>
    `;
    this.mainEl.innerHTML = html;
  }

  renderPhrase(phraseId) {
    const phrase = phrasesData.find(p => p.id === phraseId);
    if (!phrase) return;

    storage.markViewed(phraseId);
    this.updateHeaderBadges();

    // Achievement check: 100 phrases
    const learnedCount = storage.getLearnedCount();
    if (learnedCount >= 100 && !localStorage.getItem('ach_100_phrases')) {
      this.showAchievement('100_phrases');
      localStorage.setItem('ach_100_phrases', 'true');
    }
    const isFav = storage.isFavorite(phraseId);
    const starIcon = isFav ? 'star' : 'star_border';
    const starColor = isFav ? '#FFC800' : 'var(--text-muted)';

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span class="material-icons" style="cursor:pointer; font-size: 32px; color: var(--text-muted);" onclick="history.back()">chevron_left</span>
        <div style="flex: 1; height: 12px; background: #EEE; border-radius: 6px; margin: 0 16px; overflow: hidden;">
            <div style="width: 60%; background: var(--primary); height: 100%; border-radius: 6px;"></div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;" onclick="window.app.toggleFav('${phrase.id}')">
            <span class="material-icons" style="color: ${starColor}; font-size: 28px;" id="fav-btn">${starIcon}</span>
            <span id="fav-text" style="font-size: 0.7rem; color: ${starColor}; font-weight: bold; margin-top: -2px;">お気に入り</span>
        </div>
      </div>

      <div style="text-align: center; padding: 20px 0;">
        <h2 class="phrase-huge zh" onclick="window.app.speakBubble(event, '${phrase.chinese.replace(/'/g, "\\'")}')" style="cursor: pointer;">${this.renderSegmentedChinese(phrase.chinese)}</h2>
        <div class="pinyin-box" onclick="window.app.speakBubble(event, '${phrase.chinese.replace(/'/g, "\\'")}')" style="cursor: pointer; ">
            ${phrase.pinyin} <span class="material-icons" style="color: #2196F3;">volume_up</span>
        </div>
      <p class="japanese-meaning">${phrase.japanese}</p>
      </div>

      <div style="display: flex; gap: 16px; margin-bottom: 32px;">
        <button class="btn-primary" style="flex: 1; padding: 16px;" onclick="window.app.speak('${phrase.chinese.replace(/'/g, "\\'")}')">
            <span class="material-icons">play_arrow</span> 音声をきく
        </button>
        <button id="mic-btn" class="btn-secondary" style="flex: 1; padding: 16px;" onclick="window.app.startPhraseSpeechRecognition('${phrase.chinese.replace(/'/g, "\\'")}')">
      <span class="material-icons" id="mic-icon" style="color: var(--primary);"> mic</span> <span style="color: var(--primary);">話してみる</span>
        </button>
      </div>

      <div id="speech-result" style="margin-bottom: 24px; min-height: 24px; font-weight: bold; font-size: 1.1rem; color: var(--text-main); text-align: center;" class="zh"></div>
      <div id="speech-evaluation" style="margin-bottom: 24px; font-size: 0.9rem; color: var(--text-light); text-align: center; word-break: break-all;"></div>


      <div>
        <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 12px;">例文</h3>
        
        <div class="chat-container">
            ${Array.isArray(phrase.example) ? phrase.example.map((ex, index) => {
      const isRight = index % 2 !== 0; // Alternate speakers: second speaker (index 1) is on the right
      const avatarHtml = this.getAvatarHtml(ex.avatar, ex.expression, 44);
      const targetChineseSafe = ex.chinese.replace(/'/g, "\\'");

      return `
                <div style="display: flex; gap: 12px; align-items: flex-start; ${isRight ? 'flex-direction: row-reverse;' : ''}">
                    ${avatarHtml}
                    <div style="display: flex; flex-direction: column; align-items: ${isRight ? 'flex-end' : 'flex-start'}; max-width: 75%;">
                        <div class="chat-bubble ${isRight ? 'right' : 'left'}" onclick="window.app.speakBubble(event, '${targetChineseSafe}')" style="cursor: pointer;">
                            <p class="zh" style="font-size: 1.1rem; font-weight: 600; margin-bottom: 2px; ${isRight ? 'color: #0288D1;' : ''}">${this.renderSegmentedChinese(ex.chinese)} <span class="material-icons" style="font-size: 16px; color: ${isRight ? '#0288D1' : 'var(--text-muted)'}; vertical-align: middle;">volume_up</span></p>
                            <p style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 4px; font-family: 'Inter', sans-serif;">${pinyin(ex.chinese)}</p>
                            <p style="font-size: 0.85rem; color: var(--text-muted);">${ex.japanese}</p>
                        </div>
                        <button class="btn-secondary" style="margin-top: 8px; padding: 6px 16px; border-radius: 20px; font-size: 0.85rem;" onclick="window.app.startPhraseSpeechRecognition('${targetChineseSafe}')">
                            <span class="material-icons" style="font-size: 18px; color: var(--primary); vertical-align: middle;">mic</span> <span style="color: var(--primary);">この文を発音練習</span>
                        </button>
                    </div>
                </div>
                `;
    }).join('') : ''}
        </div>

        <div class="tips-box" style="margin-top: 40px;">
            <div class="tips-badge">ひとこと</div>
            ${this.getAvatarHtml('sensei', 'happy', 60).replace('style="', 'style="position: absolute; right: -10px; top: -30px; ')}
            <p style="font-size: 0.95rem; line-height: 1.6; padding-top: 10px; color: #5c4d29;">
                ${phrase.notes ? phrase.notes : 'ネイティブがめっちゃ使うから、絶対マスターしようね！'}
            </p>
        </div>
        <div style="height: 100px;"></div> <!-- Fix for footer overlap -->
      </div>
    `;

    this.mainEl.innerHTML = html;
  }

  toggleFav(phraseId) {
    const isAdded = storage.toggleFavorite(phraseId);
    const btn = document.getElementById('fav-btn');
    const textBtn = document.getElementById('fav-text');
    if (btn) {
      btn.textContent = isAdded ? 'star' : 'star_border';
      btn.style.color = isAdded ? '#FFC800' : 'var(--text-muted)';
    }
    if (textBtn) {
      textBtn.style.color = isAdded ? '#FFC800' : 'var(--text-muted)';
    }
  }

  toggleFavList(phraseId) {
    const isAdded = storage.toggleFavorite(phraseId);
    const btns = document.querySelectorAll(`.fav-btn-${phraseId}`);
    btns.forEach(btn => {
      btn.textContent = isAdded ? 'star' : 'star_border';
      btn.style.color = isAdded ? '#FFC800' : 'var(--text-muted)';
    });
  }

  renderSearch() {
    let html = `
      <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-md);">
        <span class="material-icons" style="cursor:pointer; font-size: 28px; color: var(--text-muted);" onclick="history.back()">chevron_left</span>
        <div class="search-bar" style="flex: 1; margin: 0;">
          <span class="material-icons">search</span>
          <input type="text" id="search-input" placeholder="中国語、拼音、日本語で検索" onkeyup="window.app.handleSearch(event)">
        </div>
      </div>
      <div id="search-results" style="display: flex; flex-direction: column; gap: 8px;">
        <p style="text-align: center; color: var(--text-muted); margin-top: 40px;">キーワードを入力してください</p>
      </div>
      <div style="height: 100px;"></div>
    `;
    this.mainEl.innerHTML = html;
    setTimeout(() => document.getElementById('search-input')?.focus(), 100);
  }

  handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const resultsContainer = document.getElementById('search-results');

    if (!query) {
      resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 40px;">キーワードを入力してください</p>';
      return;
    }

    const results = phrasesData.filter(p =>
      p.chinese.toLowerCase().includes(query) ||
      p.pinyin.toLowerCase().includes(query) ||
      p.japanese.toLowerCase().includes(query)
    ).slice(0, 30); // Limit results

    if (results.length === 0) {
      resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 40px;">結果が見つかりませんでした</p>';
      return;
    }

    let html = '';
    results.forEach(phrase => {
      const isFav = storage.isFavorite(phrase.id);
      const starIcon = isFav ? 'star' : 'star_border';
      const starColor = isFav ? '#FFC800' : 'var(--text-muted)';

      html += `
      <div class="card-outline" onclick="location.hash='#/phrase/${phrase.id}'" style="padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="flex: 1;">
              <p class="zh" style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px;">${phrase.chinese}</p>
              <p style="color: var(--text-light); font-size: 0.85rem;">${phrase.japanese}</p>
          </div>
          <span class="material-icons fav-btn-${phrase.id}" style="color: ${starColor}; font-size: 28px; padding: 8px;" onclick="event.stopPropagation(); window.app.toggleFavList('${phrase.id}')">${starIcon}</span>
        </div>
      `;
    });
    resultsContainer.innerHTML = html;
  }

  renderDashboard() {
    const stats = storage.getStats();
    const learnedCount = storage.getLearnedCount();
    const dueCount = storage.getDuePhrases().length;
    const favCount = storage.getFavorites().length;

    let html = `
      <div style="display: flex; align-items: center; margin-bottom: 24px;">
        <h2 style="font-size: 1.5rem; font-weight: 800; flex: 1;">学習ダッシュボード</h2>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div class="card-outline" style="text-align: center; padding: 20px 10px;">
            <div style="font-size: 2rem; font-weight: 800; color: var(--primary);">${stats.streak} <span style="font-size: 1rem; color: var(--text-muted); font-weight: normal;">日</span></div>
            <div style="color: var(--text-main); margin-top: 4px; font-weight: bold;"><span class="material-icons" style="font-size:16px; color:#F44336; vertical-align:middle;">local_fire_department</span> 連続学習</div>
        </div>
        <div class="card-outline" style="text-align: center; padding: 20px 10px;">
            <div style="font-size: 2rem; font-weight: 800; color: #4CAF50;">${learnedCount} <span style="font-size: 1rem; color: var(--text-muted); font-weight: normal;">語</span></div>
            <div style="color: var(--text-main); margin-top: 4px; font-weight: bold;"><span class="material-icons" style="font-size:16px; color:#4CAF50; vertical-align:middle;">done_all</span> 学習済み</div>
        </div>
      </div>

      <div class="card-outline" style="margin-bottom: 24px; padding: 20px; background: #FFF8E1; border-color: #FFC107;">
          <h3 style="display:flex; align-items:center; color: #F57F17; margin-bottom: 12px;"><span class="material-icons" style="margin-right: 8px;">restore</span> 忘れたころにもう一回</h3>
          <p style="color: var(--text-main); margin-bottom: 16px;">
              復習すると記憶が定着します！今日は <strong>${dueCount}</strong> 件のフレーズが復習待ちです。
          </p>
          <button class="btn-primary" style="width: 100%; background: #F57F17; box-shadow: 0 4px 0 #F9A825;" onclick="location.hash='#/quiz-select/studied'" ${dueCount === 0 ? 'disabled' : ''}>
              ${dueCount > 0 ? '復習を開始する' : '今日の復習は完了です'}
          </button>
      </div>

      <h3 style="font-size: 1.2rem; margin-bottom: 16px;">学習アクティビティ</h3>
      <div class="card-outline" style="padding: 16px;">
          <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid #EEE;">
              <span style="color: var(--text-light);">保存したフレーズ</span>
              <span style="font-weight: bold;">${favCount} 件</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 12px; padding-bottom: 12px; border-bottom: 1px solid #EEE;">
              <span style="color: var(--text-light);">総学習回数</span>
              <span style="font-weight: bold;">${stats.totalLearned || 0} 回</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 12px;">
              <span style="color: var(--text-light);">マスター度</span>
              <span style="font-weight: bold; color: #4CAF50;">${Math.round((learnedCount / Math.max(1, phrasesData.length)) * 100)} %</span>
          </div>
      </div>
      <div style="height: 100px;"></div>
    `;
    this.mainEl.innerHTML = html;
  }

  renderSettings() {
    const totalPhrases = phrasesData.length;
    const learnedCount = storage.getLearnedCount();

    let html = `
      <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg);">
        <span class="material-icons" style="cursor:pointer; font-size: 30px; color: var(--text-muted);" onclick="history.back()">chevron_left</span>
        <h2 style="font-size: 1.3rem; font-weight: 800;">設定</h2>
      </div>

      <div class="card-outline" style="padding: 20px; margin-bottom: 24px;">
        <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span class="material-icons" style="color: var(--primary);">info</span> アプリ情報
        </h3>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #EEE;">
          <span style="color: var(--text-light);">総フレーズ数</span>
          <span style="font-weight: bold;">${totalPhrases} 語</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
        </div>
      </div>

      <div class="card-outline" style="padding: 20px; margin-bottom: 16px;">
        <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span class="material-icons" style="color: var(--cat-green);">tune</span> 学習設定
        </h3>
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 0.9rem; color: var(--text-light); margin-bottom: 8px;">音声再生速度</label>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" style="flex: 1; padding: 8px; ${this.speechRate == 0.8 ? 'background: var(--primary); color: white;' : ''}" onclick="window.app.setSpeechRate(0.8)">ゆっくり</button>
            <button class="btn-secondary" style="flex: 1; padding: 8px; ${this.speechRate == 1.0 ? 'background: var(--primary); color: white;' : ''}" onclick="window.app.setSpeechRate(1.0)">標準</button>
            <button class="btn-secondary" style="flex: 1; padding: 8px; ${this.speechRate == 1.2 ? 'background: var(--primary); color: white;' : ''}" onclick="window.app.setSpeechRate(1.2)">速め</button>
          </div>
        </div>
      </div>

      <div class="card-outline" style="padding: 20px; margin-bottom: 16px;">
        <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span class="material-icons" style="color: var(--cat-blue);">help_outline</span> サポート
        </h3>
        <a href="/privacy.html" target="_blank" style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #EEE; text-decoration: none; color: inherit;">
          <span>プライバシーポリシー</span>
          <span class="material-icons" style="font-size: 18px; color: var(--text-muted);">open_in_new</span>
        </a>
        <a href="mailto:languageapp100@gmail.com" style="display: flex; justify-content: space-between; padding: 12px 0; text-decoration: none; color: inherit;">
          <span>お問い合わせ・不具合報告</span>
          <span class="material-icons" style="font-size: 18px; color: var(--text-muted);">mail</span>
        </a>
      </div>

      <div class="card-outline" style="padding: 20px; margin-bottom: 16px;">
        <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span class="material-icons" style="color: #4CAF50;">cloud_sync</span> バックアップ
        </h3>
        <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 16px;">
          学習データをファイルに保存（書き出し）したり、以前のデータを復元（読み込み）したりできます。
        </p>
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <button class="btn-primary" style="flex: 1; background: #4CAF50; box-shadow: 0 4px 0 #388E3C;" onclick="window.app.exportData()">
                <span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 4px;">download</span> 書き出し
            </button>
            <button class="btn-secondary" style="flex: 1; border-color: #4CAF50; color: #4CAF50;" onclick="document.getElementById('import-file-input').click()">
                <span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 4px;">upload</span> 読み込み
            </button>
            <input type="file" id="import-file-input" accept=".json" style="display: none;" onchange="window.app.importData(event)">
        </div>
      </div>


      <div class="card-outline" style="padding: 20px; text-align: center;">
        <div style="margin-bottom: 8px;">
            <img src="/img/logo.png" alt="みんなの中国語 ロゴ" style="height: 64px; width: 64px; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
        </div>
        <h3 style="font-weight: 800; margin-bottom: 4px;">みんなの中国語</h3>
        <p style="color: var(--text-light); font-size: 0.85rem;">リアル中国語 - 使えるフレーズを身につけよう</p>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 8px;">v1.0.0</p>
      </div>

      ${!storage.isAdFree() ? `
      <div class="card-outline" style="padding: 20px; margin-top: 16px;">
        <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span class="material-icons" style="color: #FF9800;">stars</span> 広告非表示プラン
        </h3>
        <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 16px;">
          買い切り500円でバナー広告と動画広告をすべて非表示にします。（App Store課金）
        </p>
        <button class="btn-primary" style="width: 100%; background: #FF9800; box-shadow: 0 4px 0 #F57C00;" onclick="window.app.purchaseAdFree()">
          広告を非表示にする（500円）
        </button>
      </div>
      ` : ''
      }

    <div style="height: 100px;"></div>
    `;
    this.mainEl.innerHTML = html;
  }

  setSpeechRate(rate) {
    this.speechRate = parseFloat(rate);
    localStorage.setItem('speech_rate', this.speechRate);

    // Update settings UI if present
    if (window.location.hash === '#/settings') {
      this.renderSettings();
    }

    // Update quiz speed buttons if present
    document.querySelectorAll('.btn-speed').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.getAttribute('data-rate')) === this.speechRate);
    });
  }

  renderQuiz(type) {
    if (phrasesData.length < 4) {
      this.mainEl.innerHTML = '<p style="text-align:center; padding: 20px;">フレーズデータが不足しています。</p>';
      return;
    }

    // Parse composite type: e.g. "random_listening", "srs_mix", "studied_sorting"
    const parts = type.split('_');
    let source, format;
    if (parts.length >= 2) {
      source = parts[0]; // random, studied, today, srs
      format = parts.slice(1).join('_'); // listening, speaking, sorting, mix
    } else {
      // Legacy direct types (backward compatibility)
      source = 'random';
      format = type;
    }

    this.quizSource = source;
    this.quizFormat = format; // listening, speaking, sorting, mix
    this.quizType = type;
    this.currentQuizScore = 0;
    this.currentQuizQuestion = 1;
    this.totalQuizQuestions = 5;

    // Build phrase pool based on source
    this.quizPhrasePool = this.buildQuizPhrasePool(source);

    // Anki-style queue: wrong answers get re-queued
    this.wrongAnswerQueue = [];

    this.nextQuizQuestion();
  }

  buildQuizPhrasePool(source) {
    let pool = phrasesData.filter(p => p.example && p.example.length > 0);

    if (source === 'studied') {
      const studiedIds = storage.getAllStudiedIds();
      pool = pool.filter(p => studiedIds.includes(p.id));
      // Prioritize due phrases (Anki-style: forgotten ones come first)
      const dueIds = storage.getDuePhrases();
      const duePhrases = pool.filter(p => dueIds.includes(p.id));
      const otherPhrases = pool.filter(p => !dueIds.includes(p.id));
      // Shuffle each group, then put due phrases first
      duePhrases.sort(() => Math.random() - 0.5);
      otherPhrases.sort(() => Math.random() - 0.5);
      return [...duePhrases, ...otherPhrases];
    } else if (source === 'today') {
      const todayIds = storage.getStudiedTodayIds();
      pool = pool.filter(p => todayIds.includes(p.id));
    }
    // random = full pool (no filter)

    // Shuffle pool
    return pool.sort(() => Math.random() - 0.5);
  }

  getRandomExampleSentence(forcePhraseId = null) {
    let phrasesWithExamples = phrasesData.filter(p => p.example && p.example.length > 0);
    if (phrasesWithExamples.length === 0) return phrasesData[Math.floor(Math.random() * phrasesData.length)];

    let phrase;
    if (forcePhraseId) {
      phrase = phrasesWithExamples.find(p => p.id === forcePhraseId);
    }
    if (!phrase) {
      // Try from quizPhrasePool first
      if (this.quizPhrasePool && this.quizPhrasePool.length > 0) {
        phrase = this.quizPhrasePool[Math.floor(Math.random() * this.quizPhrasePool.length)];
      } else {
        phrase = phrasesWithExamples[Math.floor(Math.random() * phrasesWithExamples.length)];
      }
    }

    const line = phrase.example[Math.floor(Math.random() * phrase.example.length)];
    return {
      id: phrase.id,
      chinese: line.chinese,
      japanese: line.japanese,
      pinyin: phrase.pinyin
    };
  }

  nextQuizQuestion() {
    // Check if we've completed the main questions AND no wrong answers remain
    if (this.currentQuizQuestion > this.totalQuizQuestions && this.wrongAnswerQueue.length === 0) {
      this.renderQuizResult();
      return;
    }

    let target;
    let isRetry = false;

    // Anki-style: prioritize wrong answer queue
    if (this.wrongAnswerQueue.length > 0 && (this.currentQuizQuestion > this.totalQuizQuestions || Math.random() < 0.4)) {
      // Pull from wrong answer queue (Anki: re-present incorrect cards)
      target = this.wrongAnswerQueue.shift();
      isRetry = true;
    }

    if (!target) {
      // Pull from the source pool
      if (this.quizPhrasePool && this.quizPhrasePool.length > 0) {
        const poolIdx = (this.currentQuizQuestion - 1) % this.quizPhrasePool.length;
        const phrase = this.quizPhrasePool[poolIdx];
        target = this.getRandomExampleSentence(phrase.id);
      } else {
        target = this.getRandomExampleSentence();
      }
    }

    this.currentQuizTarget = target;
    this.currentQuizIsRetry = isRetry;

    // Determine format
    let format = this.quizFormat;
    if (format === 'mix') {
      format = ['listening', 'speaking', 'sorting'][Math.floor(Math.random() * 3)];
    }
    this.activeQuizFormat = format;

    const questionLabel = isRetry
      ? `🔄 復習(残り${this.wrongAnswerQueue.length + 1})`
      : `問題 ${this.currentQuizQuestion} / ${this.totalQuizQuestions}`;

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <span class="material-icons" style="cursor:pointer; font-size: 32px; color: var(--text-muted);" onclick="location.hash='#/learn'">close</span>
        <div style="font-weight: bold; color: ${isRetry ? '#F44336' : 'var(--text-light)'};">${questionLabel}</div>
        <div style="width: 32px;"></div>
      </div>
    `;

    if (format === 'listening') {
      let options = [target];
      let attempts = 0; // Safeguard against infinite loops
      while (options.length < 4 && attempts < 50) {
        attempts++;
        let rnd = this.getRandomExampleSentence();
        if (!options.find(o => o.japanese === rnd.japanese)) options.push(rnd);
      }
      options = options.sort(() => Math.random() - 0.5);

      html += `
          <div style="text-align: center; margin-bottom: 40px; margin-top: 40px;">
              <button class="btn-primary" style="width: 80px; height: 80px; border-radius: 50%; box-shadow: 0 6px 0 #0288D1;" onclick="window.app.speak('${target.chinese.replace(/'/g, "\\'")}')">
                  <span class="material-icons" style="font-size: 40px;">volume_up</span>
              </button>
              <div style="display: flex; justify-content: center; gap: 8px; margin-top: 16px;">
                  <button class="btn-speed ${this.speechRate == 0.75 ? 'active' : ''}" data-rate="0.75" onclick="window.app.setSpeechRate(0.75); window.app.speak('${target.chinese.replace(/'/g, "\\'")}')">0.75x</button>
                  <button class="btn-speed ${this.speechRate == 1.0 ? 'active' : ''}" data-rate="1.0" onclick="window.app.setSpeechRate(1.0); window.app.speak('${target.chinese.replace(/'/g, "\\'")}')">1.0x</button>
                  <button class="btn-speed ${this.speechRate == 1.25 ? 'active' : ''}" data-rate="1.25" onclick="window.app.setSpeechRate(1.25); window.app.speak('${target.chinese.replace(/'/g, "\\'")}')">1.25x</button>
              </div>
              <p style="margin-top: 12px; color: var(--text-muted); font-weight: bold;">会話の音声を聴いて正しい意味を選んでください</p>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;" id="quiz-options">
              ${options.map((opt, i) => `
                  <button class="card-outline" style="text-align: left; padding: 16px; border: 2px solid #EEE;" onclick="window.app.handleListeningAnswer('${opt.japanese.replace(/'/g, "\\'")}')">
                      <span style="font-weight: bold;">${i + 1}.</span> ${opt.japanese}
                  </button>
              `).join('')}
          </div>
        `;
      const t = setTimeout(() => this.speak(target.chinese), 500);
      this.audioTimers.push(t);

    } else if (format === 'speaking') {
      html += `
          <div style="text-align: center; margin-bottom: 20px; margin-top: 20px;">
              <p style="color: var(--text-light); margin-bottom: 8px;">次の会話文を中国語で話してください</p>
              <h2 style="font-size: 1.5rem; margin-bottom: 24px;">${target.japanese}</h2>
              <div style="margin-bottom: 8px;">
                  <button class="btn-secondary" style="padding: 4px 12px; font-size: 0.85rem;" onclick="const h = document.getElementById('speaking-hint'); h.style.display = h.style.display === 'none' ? 'block' : 'none'; this.textContent = h.style.display === 'none' ? '中国語を表示する' : '中国語を隠す';">中国語を隠す</button>
                  <p id="speaking-hint" style="display: block; font-size: 1.4rem; color: var(--text-main); margin-top: 12px; font-weight: bold;" class="zh">${this.renderSegmentedChinese(target.chinese)}</p>
              </div>
          </div>
          <div style="text-align: center; margin-top: 40px;">
              <button id="mic-btn" class="btn-primary" style="width: 100px; height: 100px; border-radius: 50%; background: #FF9800; box-shadow: 0 6px 0 #F57C00;" onclick="window.app.startSpeechRecognition()">
                  <span class="material-icons" id="mic-icon" style="font-size: 50px;">mic</span>
              </button>
              <div id="speech-result" style="margin-top: 20px; min-height: 24px; font-weight: bold; font-size: 1.1rem; color: var(--text-main);" class="zh"></div>
              <div id="speech-evaluation" style="margin-top: 10px; font-size: 0.9rem; color: var(--text-light); word-break: break-all;"></div>
              <button id="next-btn" class="btn-primary" style="display: none; width: 100%; margin-top: 30px;" onclick="window.app.handleSpeechNext()">次へ</button>
          </div>
        `;
    } else if (format === 'sorting') {
      const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
      const words = Array.from(segmenter.segment(target.chinese))
        .filter(s => s.isWordLike || s.segment.trim().length > 0)
        .map(s => s.segment.trim())
        .filter(s => s && !/[.,!?。，！？]/.test(s));
      let shuffled = [...words].sort(() => Math.random() - 0.5);

      this.sortingTargetWords = words;
      this.sortingSelectedWords = [];
      this.sortingAvailableWords = shuffled;

      html += `
          <div style="text-align: center; margin-bottom: 20px; margin-top: 20px;">
              <p style="color: var(--text-light); margin-bottom: 8px;">正しい順番に並び替えてください</p>
              <h2 style="font-size: 1.3rem; margin-bottom: 24px;">${target.japanese}</h2>
          </div>
          <div id="sort-answer-area" style="min-height: 60px; border-bottom: 2px solid #ccc; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 8px; align-items: flex-end;"></div>
          <div id="sort-options-area" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;"></div>
          <button id="sort-check-btn" class="btn-primary" style="width: 100%; margin-top: 30px; display: none;" onclick="window.app.checkSortingAnswer()">判定する</button>
          <button id="next-btn" class="btn-primary" style="display: none; width: 100%; margin-top: 30px;" onclick="window.app.handleSpeechNext()">次へ</button>
      `;
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

    ansArea.innerHTML = this.sortingSelectedWords.map((w, idx) => `
          <span class="badge" style="background:#E3F2FD; color:#0288D1; font-size:1.1rem; padding: 8px 16px; cursor:pointer;" onclick="window.app.removeSortingWord(${idx})">${w}</span>
      `).join('');

    optArea.innerHTML = this.sortingAvailableWords.map((w, idx) => `
          <span class="badge" style="background:#FFF; border: 1px solid #CCC; color:#333; font-size:1.1rem; padding: 8px 16px; cursor:pointer;" onclick="window.app.addSortingWord(${idx})">${w}</span>
      `).join('');

    if (this.sortingSelectedWords.length === this.sortingTargetWords.length) {
      checkBtn.style.display = 'block';
    } else {
      checkBtn.style.display = 'none';
    }
  }

  addSortingWord(idx) {
    if (idx < 0 || idx >= this.sortingAvailableWords.length) return;
    const w = this.sortingAvailableWords.splice(idx, 1)[0];
    this.sortingSelectedWords.push(w);
    this.renderSortingOptions();
  }

  removeSortingWord(idx) {
    if (idx < 0 || idx >= this.sortingSelectedWords.length) return;
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
      this.triggerHaptic('success');
      this.playSound('success');
      this.currentQuizScore++;
      storage.updateSRS(this.currentQuizTarget.id, true);
      this.renderResultArea(this.currentQuizTarget, true);
    } else {
      ansArea.style.borderBottomColor = '#F44336';
      ansArea.innerHTML += '<div style="width:100%; color:#F44336; margin-top:8px; font-size:0.9rem;">正解: ' + targetAnswer + '</div>';
      this.speak('写错了', 'zh-CN');
      this.triggerHaptic('error');
      this.playSound('error');
      storage.updateSRS(this.currentQuizTarget.id, false);
      // Anki: push wrong answer to back of queue for re-study
      if (this.wrongAnswerQueue) {
        this.wrongAnswerQueue.push(this.currentQuizTarget);
      }
      this.renderResultArea(this.currentQuizTarget, false);
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
      this.triggerHaptic('success');
      this.playSound('success');
      storage.updateSRS(this.currentQuizTarget.id, true);
    } else {
      this.speak('写错了', 'zh-CN');
      this.triggerHaptic('error');
      this.playSound('error');
      storage.updateSRS(this.currentQuizTarget.id, false);
      // Anki: push wrong answer to back of queue for re-study
      if (this.wrongAnswerQueue) {
        this.wrongAnswerQueue.push(this.currentQuizTarget);
      }
    }

    this.renderResultArea(this.currentQuizTarget, isCorrect);
  }

  evaluateSpeech(transcript, targetText) {
    const cleanT = transcript.replace(/[.,!?。，！？\s]/g, '');
    const cleanTarget = targetText.replace(/[.,!?。，！？\s]/g, '');

    if (cleanT === cleanTarget) {
      return { score: 100, stars: 3, msg: "完全一致！" };
    }

    try {
      const targetPinyinArray = pinyin(cleanTarget, { type: 'array', toneType: 'none' });
      const userPinyinArray = pinyin(cleanT, { type: 'array', toneType: 'none' });

      let matchCount = 0;
      let scoreDetails = [];

      // Simple alignment (assumes mostly 1-to-1 if length is similar)
      // If length differs heavily, we just check inclusion.
      const maxLen = Math.max(targetPinyinArray.length, userPinyinArray.length);

      for (let i = 0; i < targetPinyinArray.length; i++) {
        const targetCharPinyin = targetPinyinArray[i];
        const targetChar = cleanTarget[i] || '';
        let matched = false;

        // Look around for matches to account for slight misalignment
        for (let j = Math.max(0, i - 2); j < Math.min(userPinyinArray.length, i + 3); j++) {
          if (userPinyinArray[j] === targetCharPinyin) {
            matched = true;
            break;
          }
        }

        if (matched) {
          matchCount++;
          scoreDetails.push(`<span style="color:#4CAF50">${targetChar}</span>`);
        } else {
          scoreDetails.push(`<span style="color:#F44336">${targetChar}</span>`);
        }
      }

      const ratio = targetPinyinArray.length > 0 ? (matchCount / targetPinyinArray.length) : 0;
      let score = Math.round(ratio * 100);

      // Fallback for character match if pinyin lib fails or weird characters exist
      if (score === 0) {
        const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
        const targetWords = Array.from(segmenter.segment(cleanTarget)).filter(s => s.isWordLike).map(s => s.segment);
        const userWords = Array.from(segmenter.segment(cleanT)).filter(s => s.isWordLike).map(s => s.segment);

        let matchedCount = 0;
        targetWords.forEach(tw => {
          if (userWords.includes(tw)) matchedCount++;
        });
        score = targetWords.length > 0 ? Math.round((matchedCount / targetWords.length) * 100) : 0;
      }

      let msg = "";
      let stars = 0;

      if (score >= 100) {
        msg = "ピンイン完全一致！素晴らしい！<br>" + scoreDetails.join('');
        stars = 3;
        score = 100;
      } else if (score >= 70) {
        msg = "惜しい！ほぼ合っていますが一部違います<br>" + scoreDetails.join('');
        stars = 2;
      } else if (score >= 30) {
        msg = "頑張って！一部の音はあっています<br>" + scoreDetails.join('');
        stars = 1;
      } else {
        msg = "やり直してみましょう...<br>" + scoreDetails.join('');
        stars = 0;
      }

      return { score, stars, msg };

    } catch (e) {
      // Fallback to basic word evaluation if pinyin-pro fails
      console.error("Pinyin evaluation error", e);
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
      } else if (score >= 30) {
        return { score: score, stars: 1, msg: "惜しい！一部の単語は認識されました" };
      } else {
        return { score: score, stars: 0, msg: "不合格...別の言葉として認識されました" };
      }
    }
  }

  startSpeechRecognition(targetChinese = null, isPhrase = false) {
    if (this.isRecognizing) return;

    this.stopAudio(); // Stop any playback before recording

    const micBtn = document.getElementById('mic-btn');
    const micIcon = document.getElementById('mic-icon');
    const resultText = document.getElementById('speech-result');
    const evalText = document.getElementById('speech-evaluation');

    if (micBtn) {
      micBtn.style.animation = 'pulse 1s infinite alternate';
      micBtn.style.background = '#F44336';
    }
    if (micIcon) micIcon.textContent = 'mic_none';
    if (resultText) resultText.innerHTML = '聞いています...';
    if (evalText) evalText.innerHTML = '';

    if (isPhrase) {
      this.currentPhraseTarget = targetChinese;
      this.isPhraseEvaluation = true;
    } else {
      this.isPhraseEvaluation = false;
    }

    if (window.ReactNativeWebView) {
      this.isRecognizing = true;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'recognizeSpeech', lang: 'zh-CN' }));
      return;
    }

    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.recognizeSpeech) {
      this.isRecognizing = true;
      window.webkit.messageHandlers.recognizeSpeech.postMessage({ lang: 'zh-CN' });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.resetMicBtn();
      if (resultText) resultText.innerHTML = 'ブラウザが音声認識に非対応です。iOSならSafariを使用してください。';
      return;
    }

    this.isRecognizing = true;
    const recognition = new SpeechRecognition();
    this.activeRecognition = recognition; // Prevent GC
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // 7-second safety timeout
    this.recognitionTimeout = setTimeout(() => {
      if (this.isRecognizing) {
        recognition.stop();
        if (resultText) resultText.innerHTML = '聞き取れませんでした。もう一度試してください。';
        this.isRecognizing = false;
        this.resetMicBtn();
      }
    }, 7000);

    recognition.onresult = (event) => {
      clearTimeout(this.recognitionTimeout);
      const transcript = event.results[0][0].transcript;
      this.receiveSpeechResult(transcript);
    };

    recognition.onnomatch = () => {
      clearTimeout(this.recognitionTimeout);
      if (resultText) resultText.innerHTML = '聞き取れませんでした。もう一度試してください。';
    };

    recognition.onerror = (event) => {
      clearTimeout(this.recognitionTimeout);
      let errorMsg = event.error;
      if (event.error === 'no-speech') {
        errorMsg = '声が聞き取れませんでした。';
      } else if (event.error === 'network') {
        errorMsg = 'ネットワークエラーが発生しました。';
      }
      if (resultText) resultText.innerHTML = 'エラーが発生しました: ' + errorMsg;
      this.isRecognizing = false;
      this.resetMicBtn();
    };

    recognition.onend = () => {
      clearTimeout(this.recognitionTimeout);
      this.isRecognizing = false;
      this.resetMicBtn();
    };

    recognition.start();
  }

  startPhraseSpeechRecognition(targetChinese) {
    this.startSpeechRecognition(targetChinese, true);
  }

  receiveSpeechResult(transcript) {
    this.isRecognizing = false;
    this.resetMicBtn();
    const resultText = document.getElementById('speech-result');
    const evalText = document.getElementById('speech-evaluation');
    const nextBtn = document.getElementById('next-btn');

    const targetChinese = this.isPhraseEvaluation ? this.currentPhraseTarget : this.currentQuizTarget.chinese;
    const evalData = this.evaluateSpeech(transcript, targetChinese);

    let starHtml = '';
    for (let i = 0; i < 3; i++) {
      starHtml += `<span class="material-icons" style="color: ${i < evalData.stars ? '#FFC800' : '#CCCCCC'}; vertical-align: middle; font-size: 24px;">star</span>`;
    }

    if (resultText) {
      resultText.innerHTML = `
            <div style="color: var(--text-main); font-weight: normal; font-size: 1rem; margin-bottom: 8px;">あなたの発音: "${transcript}"</div>
            <div style="margin-top: 8px;">判定: ${evalData.score}点！ ${starHtml}</div>
        `;
    }

    if (evalData.stars === 3) {
      if (resultText) resultText.style.color = '#4CAF50';
      if (evalText) evalText.innerHTML = evalData.msg;
      this.triggerHaptic('success');
      this.playSound('success');
      if (!this.isPhraseEvaluation) {
        this.currentQuizScore++;
        storage.updateSRS(this.currentQuizTarget.id, true);
      }
    } else if (evalData.stars >= 1) {
      if (resultText) resultText.style.color = '#FF9800';
      if (evalText) evalText.innerHTML = `${evalData.msg}<br><span style="color:#F44336;">正解: ${targetChinese}</span>`;
      this.triggerHaptic('warning');
      if (!this.isPhraseEvaluation) {
        if (evalData.stars === 2) this.currentQuizScore += 0.5;
        storage.updateSRS(this.currentQuizTarget.id, false);
        if (this.wrongAnswerQueue) this.wrongAnswerQueue.push(this.currentQuizTarget);
      }
    } else {
      if (resultText) resultText.style.color = '#F44336';
      if (evalText) evalText.innerHTML = `${evalData.msg}<br><span style="color:#F44336;">正解: ${targetChinese}</span>`;
      this.triggerHaptic('error');
      this.playSound('error');
      if (!this.isPhraseEvaluation) {
        storage.updateSRS(this.currentQuizTarget.id, false);
        if (this.wrongAnswerQueue) this.wrongAnswerQueue.push(this.currentQuizTarget);
      }
    }

    if (nextBtn) {
      nextBtn.style.display = 'none'; // Hide the old simple next btn
    }
    const micBtn = document.getElementById('mic-btn');
    if (micBtn && !this.isPhraseEvaluation) micBtn.style.display = 'none';

    this.renderResultArea(this.currentQuizTarget, evalData.stars === 3);
    this.isPhraseEvaluation = false;
  }

  resetMicBtn() {
    const micBtn = document.getElementById('mic-btn');
    const micIcon = document.getElementById('mic-icon');
    if (micBtn) {
      micBtn.style.animation = 'none';
      micBtn.style.background = '#FF9800';
    }
    if (micIcon) micIcon.textContent = 'mic';
  }

  handleSpeechNext() {
    if (!this.currentQuizIsRetry) this.currentQuizQuestion++;
    this.nextQuizQuestion();
  }

  renderQuizResult() {
    storage.updateStats(this.currentQuizScore > 0);
    const stats = storage.getStats();
    this.checkAdTrigger(this.totalQuizQuestions);

    // Achievements check
    const learnedCount = storage.getLearnedCount();
    if (learnedCount >= 100 && !localStorage.getItem('ach_100_phrases')) {
      this.showAchievement('100_phrases');
      localStorage.setItem('ach_100_phrases', 'true');
    }
    if (this.currentQuizScore === this.totalQuizQuestions) {
      this.showAchievement('perfect_score');
      this.playSound('fanfare');
    }

    let message = 'クイズ完了！';
    if (this.currentQuizScore >= this.totalQuizQuestions * 0.8) {
      message = '天才的！素晴らしい成績です！🎉 パンダ先生も大絶賛！';
    } else if (this.currentQuizScore >= this.totalQuizQuestions * 0.5) {
      message = 'よくできました！その調子です！✨ コツコツ頑張っていますね！';
    } else {
      message = 'よく頑張りました！間違えた問題は後で復習しましょう💪';
    }

    let streakMessage = '';
    if (stats.streak > 0) {
      streakMessage = `<div style="color: #F44336; font-size: 1.1rem; font-weight: bold; margin-bottom: 20px;">🔥 ${stats.streak}日連続学習中！素晴らしい継続力です！</div>`;
    }

    let html = `
          <div style="text-align: center; margin-top: 60px;">
              <h2 style="font-size: 2rem; margin-bottom: 20px;">結果発表</h2>
              <div style="font-size: 4rem; font-weight: 800; color: #FF9800; margin-bottom: 10px;">
                  ${this.currentQuizScore} <span style="font-size: 2rem; color: var(--text-main);">/ ${this.totalQuizQuestions}</span>
              </div>
              <p style="font-size: 1.2rem; font-weight: bold; margin-bottom: 20px;">${message}</p>
              ${streakMessage}
              
              <button class="btn-primary" style="width: 100%; margin-bottom: 16px;" onclick="location.hash='#/learn'">学習メニューに戻る</button>
              <button class="btn-secondary" style="width: 100%;" onclick="location.hash='#/'">ホームへ</button>
          </div>
      `;
    this.mainEl.innerHTML = html;
  }

  // --- Monetization & Review Logic ---
  checkAdTrigger(phrasesLearned) {
    if (storage.isAdFree()) return;

    const oldTotal = storage.getAdStudyCount();
    let newTotal = oldTotal;
    for (let i = 0; i < phrasesLearned; i++) {
      newTotal = storage.incrementAdStudyCount();
    }

    // Check if crossing a block of 10
    const oldBlock = Math.floor(oldTotal / 10);
    const newBlock = Math.floor(newTotal / 10);

    if (newBlock > oldBlock && newBlock >= 1) {
      if (newBlock === 1) {
        // First 10 learned -> show review modal (Native StoreKit)
        this.requestNativeReview();
      } else {
        // Every subsequent 10 (20, 30...) -> show ad modal (Native AdMob Interstitial)
        this.showNativeInterstitialAd();
      }
    }
  }

  requestNativeReview() {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.requestReview) {
      window.webkit.messageHandlers.requestReview.postMessage({});
    } else {
      console.log("No Native Bridge detected for Review Prompt");
    }
  }

  showNativeInterstitialAd() {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.showAd) {
      window.webkit.messageHandlers.showAd.postMessage({ type: "interstitial" });
    } else {
      console.log("No Native Bridge detected for Interstitial Ad");
    }
  }

  // --- Exposed methods for iOS Native to call ---

  // Called by iOS Native when the purchase is confirmed & successful
  onNativePurchaseSuccess() {
    alert('【開発用モック】App Store課金処理が完了しました。\n広告が非表示になります。');
    storage.setAdFree(true);
    location.reload();
  }

  exportData() {
    try {
      const dataStr = localStorage.getItem('real_chinese_progress') || '{}';
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `real-chinese-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('データ書き出しに失敗しました。');
    }
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('既存の学習データを上書きして復元します。よろしいですか？')) {
      event.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        // Basic validation
        JSON.parse(content);
        localStorage.setItem('real_chinese_progress', content);
        alert('データを正常に復元しました。アプリを再読み込みします。');
        location.reload();
      } catch (err) {
        console.error('Import failed:', err);
        alert('無効なデータファイルです。復元を中止しました。');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  }


  purchaseAdFree() {
    // Trigger Native App Store IAP
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.purchase) {
      window.webkit.messageHandlers.purchase.postMessage({ productId: "ad_free_500" });
    } else {
      // Fallback if testing in web browser
      if (confirm('Native Bridgeが存在しません。Webブラウザでのテスト用に広告を非表示にしますか？(開発用モック)')) {
        this.onNativePurchaseSuccess();
      }
    }
  }
}

// Global scope attachment for iOS to call back
window.onNativePurchaseSuccess = () => {
  if (window.app) window.app.onNativePurchaseSuccess();
};

window.app = new App();
