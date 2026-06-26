/**
 * Tiny Shadow Match
 * A calm, offline shadow matching app for young children.
 *
 * - Works fully offline (no internet, no permissions, no accounts).
 * - Local-only progress, statistics, and achievements via AsyncStorage.
 * - Two play styles: Tap Match and Drag Match.
 * - Three difficulty levels: Easy, Medium, Hard.
 *
 * All screens live in this single file by design (see project file list).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  PanResponder,
  Switch,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { SystemBars } from 'react-native-edge-to-edge';
import { useKeepAwake } from 'expo-keep-awake';

/* ------------------------------------------------------------------ *
 *  Visual palette (calm, distinct to this app)
 * ------------------------------------------------------------------ */
const C = {
  skyTop: '#A8E6DB',
  skyBottom: '#C5B6F0',
  panel: '#FFFFFF',
  panelSoft: '#F3EEFF',
  ink: '#3A3552',
  inkSoft: '#6F6890',
  sun: '#FFC766',
  sunDeep: '#FF9F43',
  mint: '#7FD8C4',
  grape: '#9C8CE0',
  rose: '#FF9BB3',
  shadow: '#4A4763',
  good: '#5BC88B',
  card: '#FBF8FF',
  border: '#E7E0FB',
};

/* ------------------------------------------------------------------ *
 *  Local static object data only (no external assets / APIs)
 * ------------------------------------------------------------------ */
const OBJECT_SETS = [
  {
    id: 'animals',
    title: 'Animals',
    cover: '🐶',
    color: C.mint,
    items: [
      { id: 'dog', emoji: '🐶', label: 'Dog' },
      { id: 'cat', emoji: '🐱', label: 'Cat' },
      { id: 'rabbit', emoji: '🐰', label: 'Rabbit' },
      { id: 'bear', emoji: '🐻', label: 'Bear' },
      { id: 'fox', emoji: '🦊', label: 'Fox' },
      { id: 'frog', emoji: '🐸', label: 'Frog' },
      { id: 'monkey', emoji: '🐵', label: 'Monkey' },
      { id: 'pig', emoji: '🐷', label: 'Pig' },
    ],
  },
  {
    id: 'toys',
    title: 'Toys',
    cover: '🧸',
    color: C.rose,
    items: [
      { id: 'teddy', emoji: '🧸', label: 'Teddy' },
      { id: 'balloon', emoji: '🎈', label: 'Balloon' },
      { id: 'kite', emoji: '🪁', label: 'Kite' },
      { id: 'ball', emoji: '⚽', label: 'Ball' },
      { id: 'blocks', emoji: '🧩', label: 'Puzzle' },
      { id: 'drum', emoji: '🥁', label: 'Drum' },
      { id: 'rocket', emoji: '🚀', label: 'Rocket' },
      { id: 'duck', emoji: '🦆', label: 'Duck' },
    ],
  },
  {
    id: 'fruits',
    title: 'Fruits',
    cover: '🍎',
    color: C.sun,
    items: [
      { id: 'apple', emoji: '🍎', label: 'Apple' },
      { id: 'banana', emoji: '🍌', label: 'Banana' },
      { id: 'grapes', emoji: '🍇', label: 'Grapes' },
      { id: 'strawberry', emoji: '🍓', label: 'Strawberry' },
      { id: 'orange', emoji: '🍊', label: 'Orange' },
      { id: 'watermelon', emoji: '🍉', label: 'Watermelon' },
      { id: 'pear', emoji: '🍐', label: 'Pear' },
      { id: 'cherries', emoji: '🍒', label: 'Cherries' },
    ],
  },
  {
    id: 'vehicles',
    title: 'Vehicles',
    cover: '🚗',
    color: C.grape,
    items: [
      { id: 'car', emoji: '🚗', label: 'Car' },
      { id: 'bus', emoji: '🚌', label: 'Bus' },
      { id: 'train', emoji: '🚂', label: 'Train' },
      { id: 'bike', emoji: '🚲', label: 'Bike' },
      { id: 'plane', emoji: '✈️', label: 'Plane' },
      { id: 'boat', emoji: '⛵', label: 'Boat' },
      { id: 'tractor', emoji: '🚜', label: 'Tractor' },
      { id: 'rocket2', emoji: '🚁', label: 'Helicopter' },
    ],
  },
];

const DIFFICULTIES = [
  { id: 'easy', title: 'Easy', cover: '🟢', choices: 2 },
  { id: 'medium', title: 'Medium', cover: '🟡', choices: 3 },
  { id: 'hard', title: 'Hard', cover: '🟣', choices: 4 },
];

const MODES = [
  { id: 'tap', title: 'Tap Match', cover: '👆' },
  { id: 'drag', title: 'Drag Match', cover: '✋' },
];

const ROUNDS_PER_SESSION = 5;

const BADGES = [
  { id: 'first_match', emoji: '🌟', title: 'First Match', desc: 'Make your first shadow match.' },
  { id: 'ten_matches', emoji: '🏅', title: 'Ten Matches', desc: 'Match 10 shadows in total.' },
  { id: 'fifty_matches', emoji: '🏆', title: 'Fifty Matches', desc: 'Match 50 shadows in total.' },
  { id: 'all_sets', emoji: '🧭', title: 'Explorer', desc: 'Play every object set.' },
  { id: 'drag_star', emoji: '✋', title: 'Drag Star', desc: 'Finish a Drag Match session.' },
  { id: 'all_stars', emoji: '💫', title: 'All Stars', desc: 'Finish a session with every match correct.' },
];

/* ------------------------------------------------------------------ *
 *  Local storage keys (domain-specific to this app)
 * ------------------------------------------------------------------ */
const KEY_SETTINGS = '@tinyShadowMatch:settings:v1';
const KEY_STATS = '@tinyShadowMatch:stats:v1';
const KEY_BADGES = '@tinyShadowMatch:badges:v1';

const DEFAULT_SETTINGS = {
  difficulty: 'easy',
  feedbackEnabled: true,
};

const DEFAULT_STATS = {
  totalCorrect: 0,
  sessions: 0,
  dragSessions: 0,
  allStarSessions: 0,
  setsPlayed: { animals: false, toys: false, fruits: false, vehicles: false },
};

/* ------------------------------------------------------------------ *
 *  Small helpers
 * ------------------------------------------------------------------ */
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function loadJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch (e) {
    return fallback;
  }
}

async function saveJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Storage is local and optional; ignore write errors silently.
  }
}

/**
 * Build one round.
 * Easy uses very different objects (from other sets) as obvious choices.
 * Medium and Hard keep distractors inside the same set.
 */
function buildRound(setId, choiceCount) {
  const set = OBJECT_SETS.find((s) => s.id === setId) || OBJECT_SETS[0];
  const target = pickOne(set.items);

  let pool;
  if (choiceCount <= 2) {
    // Easy: pull the single distractor from a different set for clarity.
    const otherItems = OBJECT_SETS.filter((s) => s.id !== setId).flatMap((s) => s.items);
    pool = otherItems;
  } else {
    // Medium / Hard: distractors come from the same set.
    pool = set.items.filter((it) => it.id !== target.id);
  }

  const distractors = shuffle(pool)
    .filter((it) => it.id !== target.id)
    .slice(0, Math.max(0, choiceCount - 1));

  const choices = shuffle([target, ...distractors]).map((it) => ({
    ...it,
    correct: it.id === target.id,
  }));

  return { target, choices };
}

function computeUnlocked(stats) {
  const u = {};
  if (stats.totalCorrect >= 1) u.first_match = true;
  if (stats.totalCorrect >= 10) u.ten_matches = true;
  if (stats.totalCorrect >= 50) u.fifty_matches = true;
  const sp = stats.setsPlayed || {};
  if (sp.animals && sp.toys && sp.fruits && sp.vehicles) u.all_sets = true;
  if ((stats.dragSessions || 0) >= 1) u.drag_star = true;
  if ((stats.allStarSessions || 0) >= 1) u.all_stars = true;
  return u;
}

/* ------------------------------------------------------------------ *
 *  Reusable presentational pieces
 * ------------------------------------------------------------------ */

// Colorful object icon (the answer choices).
function ObjectIcon({ emoji, size = 78 }) {
  return <Text style={{ fontSize: size }}>{emoji}</Text>;
}

// Dark silhouette of an object, derived from the emoji glyph shape.
function ShadowSilhouette({ emoji, size = 150 }) {
  return (
    <Text
      allowFontScaling={false}
      style={{
        fontSize: size,
        color: 'transparent',
        textShadowColor: C.shadow,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: Platform.OS === 'android' ? 8 : 2,
      }}
    >
      {emoji}
    </Text>
  );
}

// Large, child-friendly primary button.
function BigButton({ label, emoji, onPress, color = C.sun, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.bigButton,
        { backgroundColor: color, transform: [{ scale: pressed ? 0.96 : 1 }] },
        style,
      ]}
      hitSlop={8}
    >
      {emoji ? <Text style={styles.bigButtonEmoji}>{emoji}</Text> : null}
      {label ? <Text style={styles.bigButtonText}>{label}</Text> : null}
    </Pressable>
  );
}

// Small round icon button (Home / Back).
function RoundButton({ emoji, onPress, color = C.panelSoft }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundButton,
        { backgroundColor: color, transform: [{ scale: pressed ? 0.92 : 1 }] },
      ]}
      hitSlop={10}
    >
      <Text style={styles.roundButtonEmoji}>{emoji}</Text>
    </Pressable>
  );
}

// Progress dots for the current session.
function ProgressDots({ total, index }) {
  const dots = [];
  for (let i = 0; i < total; i++) {
    dots.push(
      <View
        key={i}
        style={[
          styles.dot,
          { backgroundColor: i < index ? C.good : i === index ? C.sun : C.border },
        ]}
      />
    );
  }
  return <View style={styles.dotRow}>{dots}</View>;
}

// Row of stars for results.
function StarRow({ filled, total }) {
  const stars = [];
  for (let i = 0; i < total; i++) {
    stars.push(
      <Text key={i} style={[styles.resultStar, { opacity: i < filled ? 1 : 0.25 }]}>
        ⭐
      </Text>
    );
  }
  return <View style={styles.starRow}>{stars}</View>;
}

/* ------------------------------------------------------------------ *
 *  Screen: Home
 * ------------------------------------------------------------------ */
function ShadowHomeScreen({ nav }) {
  return (
    <ScreenFrame>
      <View style={styles.homeHeader}>
        <Text style={styles.homeStar}>⭐</Text>
        <Text style={styles.homeTitle}>Tiny Shadow Match</Text>
        <Text style={styles.homeHint}>Match each shape to its shadow.</Text>
      </View>

      <View style={styles.homeButtons}>
        <BigButton
          label="Start"
          emoji="▶️"
          color={C.sun}
          onPress={() => nav.go('objectSet')}
          style={styles.homeStart}
        />
        <View style={styles.homeRow}>
          <BigButton
            label="Stars"
            emoji="🏅"
            color={C.mint}
            onPress={() => nav.go('achievements')}
            style={styles.homeHalf}
          />
          <BigButton
            label="Settings"
            emoji="⚙️"
            color={C.grape}
            onPress={() => nav.go('parentSettings')}
            style={styles.homeHalf}
          />
        </View>
      </View>

      <Text style={styles.footNote}>Calm, offline, ad-free.</Text>
    </ScreenFrame>
  );
}

/* ------------------------------------------------------------------ *
 *  Screen: Object Set selection
 * ------------------------------------------------------------------ */
function ObjectSetScreen({ nav }) {
  return (
    <ScreenFrame>
      <TopBar onHome={() => nav.reset('home')} onBack={() => nav.back()} />
      <Text style={styles.screenTitle}>Pick a set</Text>
      <View style={styles.grid}>
        {OBJECT_SETS.map((set) => (
          <Pressable
            key={set.id}
            onPress={() => nav.go('gameMode', { setId: set.id })}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: set.color, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Text style={styles.tileEmoji}>{set.cover}</Text>
            <Text style={styles.tileLabel}>{set.title}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenFrame>
  );
}

/* ------------------------------------------------------------------ *
 *  Screen: Game Mode + Difficulty
 * ------------------------------------------------------------------ */
function GameModeScreen({ nav, params, settings }) {
  const setId = params.setId || 'animals';
  const [mode, setMode] = useState('tap');
  const [difficulty, setDifficulty] = useState(settings.difficulty || 'easy');

  return (
    <ScreenFrame>
      <TopBar onHome={() => nav.reset('home')} onBack={() => nav.back()} />
      <Text style={styles.screenTitle}>How to play</Text>

      <Text style={styles.sectionLabel}>Mode</Text>
      <View style={styles.choiceRow}>
        {MODES.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => setMode(m.id)}
            style={[
              styles.optionCard,
              mode === m.id && styles.optionCardActive,
            ]}
          >
            <Text style={styles.optionEmoji}>{m.cover}</Text>
            <Text style={styles.optionText}>{m.title}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Difficulty</Text>
      <View style={styles.choiceRow}>
        {DIFFICULTIES.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => setDifficulty(d.id)}
            style={[
              styles.optionCardSmall,
              difficulty === d.id && styles.optionCardActive,
            ]}
          >
            <Text style={styles.optionEmoji}>{d.cover}</Text>
            <Text style={styles.optionTextSmall}>{d.title}</Text>
          </Pressable>
        ))}
      </View>

      <BigButton
        label="Start"
        emoji="▶️"
        color={C.sun}
        onPress={() => nav.go('shadowGame', { setId, mode, difficulty })}
        style={styles.modeStart}
      />
    </ScreenFrame>
  );
}

/* ------------------------------------------------------------------ *
 *  Tap board
 * ------------------------------------------------------------------ */
function TapBoard({ round, choiceCount, onCorrect, onWrong, feedbackEnabled, shadowPulse }) {
  const [lockedId, setLockedId] = useState(null);

  useEffect(() => {
    setLockedId(null);
  }, [round]);

  const handlePress = (choice) => {
    if (lockedId) return;
    if (choice.correct) {
      setLockedId(choice.id);
      onCorrect();
    } else {
      onWrong(choice.id);
    }
  };

  return (
    <View style={styles.boardFull}>
      <Animated.View style={[styles.shadowZone, { transform: [{ scale: shadowPulse }] }]}>
        <ShadowSilhouette emoji={round.target.emoji} size={shadowSizeFor(choiceCount)} />
      </Animated.View>

      <View style={styles.choicesWrap}>
        {round.choices.map((choice) => {
          const isLocked = lockedId === choice.id;
          return (
            <Pressable
              key={choice.id}
              onPress={() => handlePress(choice)}
              style={({ pressed }) => [
                styles.choiceCard,
                choiceCount >= 4 && styles.choiceCardSmall,
                { transform: [{ scale: pressed ? 0.94 : 1 }] },
                isLocked && styles.choiceCardCorrect,
              ]}
            >
              <ObjectIcon emoji={choice.emoji} size={choiceCount >= 4 ? 60 : 74} />
              {isLocked ? <Text style={styles.checkBadge}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 *  Drag board (PanResponder + Animated)
 * ------------------------------------------------------------------ */
function DraggableChoice({ choice, choiceCount, dropZoneRef, lockedRef, onCorrect, onWrong }) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const originRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const viewRef = useRef(null);
  const snappedRef = useRef(false);
  const [snapped, setSnapped] = useState(false);

  // Reset when a new round arrives (component is re-keyed, but stay safe).
  useEffect(() => {
    snappedRef.current = false;
    setSnapped(false);
    pan.setValue({ x: 0, y: 0 });
  }, [choice.id, pan]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !snappedRef.current && !lockedRef.current,
      onMoveShouldSetPanResponder: () => !snappedRef.current && !lockedRef.current,
      onPanResponderGrant: () => {
        if (viewRef.current && viewRef.current.measureInWindow) {
          viewRef.current.measureInWindow((x, y, w, h) => {
            originRef.current = { x, y, w, h };
          });
        }
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, g) => {
        const dz = dropZoneRef.current;
        const inside =
          dz &&
          g.moveX >= dz.x &&
          g.moveX <= dz.x + dz.w &&
          g.moveY >= dz.y &&
          g.moveY <= dz.y + dz.h;

        if (inside && choice.correct) {
          const o = originRef.current;
          let tx = 0;
          let ty = -140;
          if (dz && o.w) {
            tx = dz.x + dz.w / 2 - (o.x + o.w / 2);
            ty = dz.y + dz.h / 2 - (o.y + o.h / 2);
          }
          snappedRef.current = true;
          setSnapped(true);
          Animated.spring(pan, {
            toValue: { x: tx, y: ty },
            friction: 6,
            tension: 60,
            useNativeDriver: false,
          }).start(() => onCorrect());
        } else {
          if (inside && !choice.correct) {
            onWrong(choice.id);
          }
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      ref={viewRef}
      {...responder.panHandlers}
      style={[
        styles.dragChip,
        choiceCount >= 4 && styles.dragChipSmall,
        { transform: pan.getTranslateTransform() },
        snapped && styles.dragChipSnapped,
      ]}
    >
      <ObjectIcon emoji={choice.emoji} size={choiceCount >= 4 ? 52 : 64} />
    </Animated.View>
  );
}

function DragBoard({ round, choiceCount, onCorrect, onWrong, shadowPulse }) {
  const dropZoneRef = useRef(null);
  const lockedRef = useRef(false);
  const zoneViewRef = useRef(null);

  useEffect(() => {
    lockedRef.current = false;
  }, [round]);

  const measureZone = () => {
    if (zoneViewRef.current && zoneViewRef.current.measureInWindow) {
      zoneViewRef.current.measureInWindow((x, y, w, h) => {
        dropZoneRef.current = { x, y, w, h };
      });
    }
  };

  const handleCorrect = () => {
    lockedRef.current = true;
    onCorrect();
  };

  return (
    <View style={styles.boardFull}>
      <Animated.View
        ref={zoneViewRef}
        onLayout={measureZone}
        style={[styles.shadowZone, styles.dropZone, { transform: [{ scale: shadowPulse }] }]}
      >
        <ShadowSilhouette emoji={round.target.emoji} size={shadowSizeFor(choiceCount)} />
      </Animated.View>

      <Text style={styles.dragHint}>Drag the match up</Text>

      <View style={styles.choicesWrap}>
        {round.choices.map((choice) => (
          <DraggableChoice
            key={round.key + ':' + choice.id}
            choice={choice}
            choiceCount={choiceCount}
            dropZoneRef={dropZoneRef}
            lockedRef={lockedRef}
            onCorrect={handleCorrect}
            onWrong={onWrong}
          />
        ))}
      </View>
    </View>
  );
}

function shadowSizeFor(choiceCount) {
  if (choiceCount <= 2) return 168;
  if (choiceCount === 3) return 150;
  return 138;
}

/* ------------------------------------------------------------------ *
 *  Screen: Shadow Game (keeps device awake while active)
 * ------------------------------------------------------------------ */
function ShadowGameScreen({ nav, params, settings, onSessionComplete }) {
  useKeepAwake(); // active only while this screen is mounted

  const setId = params.setId || 'animals';
  const mode = params.mode || 'tap';
  const difficulty = params.difficulty || 'easy';
  const choiceCount = (DIFFICULTIES.find((d) => d.id === difficulty) || DIFFICULTIES[0]).choices;

  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [round, setRound] = useState(() => makeRound());
  const [showCheck, setShowCheck] = useState(false);

  const shadowPulse = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const advancingRef = useRef(false);

  function makeRound() {
    const r = buildRound(setId, choiceCount);
    r.key = Math.random().toString(36).slice(2);
    return r;
  }

  const pulseShadow = useCallback(() => {
    Animated.sequence([
      Animated.timing(shadowPulse, { toValue: 1.12, duration: 160, useNativeDriver: true }),
      Animated.spring(shadowPulse, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [shadowPulse]);

  const handleWrong = useCallback(() => {
    pulseShadow();
  }, [pulseShadow]);

  const handleCorrect = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    const nextCorrect = correctCount + 1;
    setCorrectCount(nextCorrect);
    setShowCheck(true);
    checkScale.setValue(0);
    Animated.spring(checkScale, {
      toValue: 1,
      friction: settings.feedbackEnabled ? 4 : 6,
      useNativeDriver: true,
    }).start();

    const delay = settings.feedbackEnabled ? 850 : 650;
    setTimeout(() => {
      setShowCheck(false);
      const nextIndex = index + 1;
      if (nextIndex >= ROUNDS_PER_SESSION) {
        onSessionComplete(
          { setId, mode, correct: nextCorrect, total: ROUNDS_PER_SESSION },
          (resultParams) => nav.reset('shadowResult', resultParams)
        );
      } else {
        setIndex(nextIndex);
        setRound(makeRound());
        advancingRef.current = false;
      }
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correctCount, index, settings.feedbackEnabled]);

  return (
    <ScreenFrame>
      <TopBar onHome={() => nav.reset('home')} onBack={() => nav.reset('home')} />
      <ProgressDots total={ROUNDS_PER_SESSION} index={index} />

      <View style={styles.gameArea}>
        {mode === 'drag' ? (
          <DragBoard
            round={round}
            choiceCount={choiceCount}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
            shadowPulse={shadowPulse}
          />
        ) : (
          <TapBoard
            round={round}
            choiceCount={choiceCount}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
            feedbackEnabled={settings.feedbackEnabled}
            shadowPulse={shadowPulse}
          />
        )}
      </View>

      {showCheck ? (
        <View pointerEvents="none" style={styles.checkOverlay}>
          <Animated.View style={[styles.checkBubble, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkBig}>✓</Text>
            <Text style={styles.checkWord}>Good</Text>
          </Animated.View>
        </View>
      ) : null}
    </ScreenFrame>
  );
}

/* ------------------------------------------------------------------ *
 *  Screen: Result
 * ------------------------------------------------------------------ */
function ShadowResultScreen({ nav, params }) {
  const correct = params.correct || 0;
  const total = params.total || ROUNDS_PER_SESSION;
  const newBadges = params.newBadges || [];
  const stars = correct >= total ? 3 : correct >= Math.ceil(total * 0.6) ? 2 : 1;
  const word = stars === 3 ? 'Great' : stars === 2 ? 'Well done' : 'Good';

  return (
    <ScreenFrame>
      <View style={styles.resultWrap}>
        <Text style={styles.resultEmoji}>🎉</Text>
        <Text style={styles.resultWord}>{word}</Text>
        <StarRow filled={stars} total={3} />
        <Text style={styles.resultCount}>
          {correct} / {total} matches
        </Text>

        {newBadges.length > 0 ? (
          <View style={styles.newBadgeBox}>
            <Text style={styles.newBadgeTitle}>New sticker!</Text>
            <View style={styles.newBadgeRow}>
              {newBadges.map((b) => (
                <Text key={b.id} style={styles.newBadgeEmoji}>
                  {b.emoji}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.resultButtons}>
          <BigButton
            label="Again"
            emoji="🔁"
            color={C.mint}
            onPress={() => nav.reset('objectSet')}
            style={styles.homeHalf}
          />
          <BigButton
            label="Home"
            emoji="🏠"
            color={C.grape}
            onPress={() => nav.reset('home')}
            style={styles.homeHalf}
          />
        </View>
      </View>
    </ScreenFrame>
  );
}

/* ------------------------------------------------------------------ *
 *  Screen: Achievements
 * ------------------------------------------------------------------ */
function AchievementsScreen({ nav, badges, stats }) {
  return (
    <ScreenFrame>
      <TopBar onHome={() => nav.reset('home')} onBack={() => nav.back()} />
      <Text style={styles.screenTitle}>Stickers & Stars</Text>
      <Text style={styles.subtleText}>Shadow match progress: {stats.totalCorrect} matches</Text>

      <ScrollView
        style={styles.badgeScroll}
        contentContainerStyle={styles.badgeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {BADGES.map((b) => {
          const earned = !!badges[b.id];
          return (
            <View key={b.id} style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
              <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>
                {earned ? b.emoji : '🔒'}
              </Text>
              <View style={styles.badgeTextWrap}>
                <Text style={styles.badgeTitle}>{b.title}</Text>
                <Text style={styles.badgeDesc}>{b.desc}</Text>
              </View>
              {earned ? <Text style={styles.badgeCheck}>✓</Text> : null}
            </View>
          );
        })}
      </ScrollView>
    </ScreenFrame>
  );
}

/* ------------------------------------------------------------------ *
 *  Screen: Parent / Settings
 * ------------------------------------------------------------------ */
function ParentSettingsScreen({ nav, settings, setSettings, stats, onReset }) {
  const updateDifficulty = (id) => setSettings({ ...settings, difficulty: id });

  return (
    <ScreenFrame>
      <TopBar onHome={() => nav.reset('home')} onBack={() => nav.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsContent}>
        <Text style={styles.screenTitle}>Settings</Text>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsLabel}>Default difficulty</Text>
          <View style={styles.choiceRow}>
            {DIFFICULTIES.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => updateDifficulty(d.id)}
                style={[
                  styles.optionCardSmall,
                  settings.difficulty === d.id && styles.optionCardActive,
                ]}
              >
                <Text style={styles.optionEmoji}>{d.cover}</Text>
                <Text style={styles.optionTextSmall}>{d.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <View style={styles.flex1}>
              <Text style={styles.settingsLabel}>Feedback effects</Text>
              <Text style={styles.settingsHelp}>Gentle visual celebration on a correct match.</Text>
            </View>
            <Switch
              value={settings.feedbackEnabled}
              onValueChange={(v) => setSettings({ ...settings, feedbackEnabled: v })}
              trackColor={{ true: C.mint, false: C.border }}
              thumbColor={C.panel}
            />
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsLabel}>Progress</Text>
          <Text style={styles.statLine}>Total matches: {stats.totalCorrect}</Text>
          <Text style={styles.statLine}>Sessions played: {stats.sessions}</Text>
          <Text style={styles.statLine}>
            Sets explored:{' '}
            {Object.values(stats.setsPlayed || {}).filter(Boolean).length} / 4
          </Text>
          <Pressable onPress={onReset} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset progress</Text>
          </Pressable>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsLabel}>Privacy</Text>
          <Text style={styles.privacyText}>
            Tiny Shadow Match does not collect, store, or share personal information. The app
            works offline without internet access. Progress, statistics, achievements, and
            settings are stored only on the device.
          </Text>
          <Text style={styles.privacyText}>
            Tiny Shadow Match is a calm offline shadow matching app for children. It does not use
            ads, purchases, accounts, internet access, permissions, social sharing, or personal
            data collection.
          </Text>
        </View>
      </ScrollView>
    </ScreenFrame>
  );
}

/* ------------------------------------------------------------------ *
 *  Shared layout pieces
 * ------------------------------------------------------------------ */
function ScreenFrame({ children }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.frame}>{children}</View>
    </SafeAreaView>
  );
}

function TopBar({ onHome, onBack }) {
  return (
    <View style={styles.topBar}>
      <RoundButton emoji="◀" onPress={onBack} />
      <RoundButton emoji="🏠" onPress={onHome} color={C.panelSoft} />
    </View>
  );
}

/* ------------------------------------------------------------------ *
 *  Root App: simple stack navigation + local persistence
 * ------------------------------------------------------------------ */
export default function App() {
  const [stack, setStack] = useState([{ name: 'home', params: {} }]);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [badges, setBadges] = useState({});
  const [ready, setReady] = useState(false);

  // Load local data once.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, st, b] = await Promise.all([
        loadJSON(KEY_SETTINGS, DEFAULT_SETTINGS),
        loadJSON(KEY_STATS, DEFAULT_STATS),
        loadJSON(KEY_BADGES, {}),
      ]);
      if (!alive) return;
      setSettingsState(s);
      setStats(st);
      setBadges(b);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setSettings = useCallback((next) => {
    setSettingsState(next);
    saveJSON(KEY_SETTINGS, next);
  }, []);

  const nav = {
    go: (name, params = {}) => setStack((s) => [...s, { name, params }]),
    back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    reset: (name, params = {}) => setStack([{ name, params }]),
  };

  const handleSessionComplete = useCallback(
    (result, goResult) => {
      const prevUnlocked = computeUnlocked(stats);

      const nextStats = {
        ...stats,
        totalCorrect: stats.totalCorrect + result.correct,
        sessions: stats.sessions + 1,
        dragSessions: stats.dragSessions + (result.mode === 'drag' ? 1 : 0),
        allStarSessions:
          stats.allStarSessions + (result.correct >= result.total ? 1 : 0),
        setsPlayed: { ...stats.setsPlayed, [result.setId]: true },
      };

      const nowUnlocked = computeUnlocked(nextStats);
      const mergedBadges = { ...badges, ...nowUnlocked };
      const newBadges = BADGES.filter((b) => nowUnlocked[b.id] && !prevUnlocked[b.id] && !badges[b.id]);

      setStats(nextStats);
      setBadges(mergedBadges);
      saveJSON(KEY_STATS, nextStats);
      saveJSON(KEY_BADGES, mergedBadges);

      goResult({ correct: result.correct, total: result.total, newBadges });
    },
    [stats, badges]
  );

  const handleReset = useCallback(() => {
    setStats(DEFAULT_STATS);
    setBadges({});
    saveJSON(KEY_STATS, DEFAULT_STATS);
    saveJSON(KEY_BADGES, {});
  }, []);

  const current = stack[stack.length - 1];

  const renderScreen = () => {
    if (!ready) {
      return (
        <ScreenFrame>
          <View style={styles.loading}>
            <Text style={styles.homeStar}>⭐</Text>
          </View>
        </ScreenFrame>
      );
    }
    switch (current.name) {
      case 'objectSet':
        return <ObjectSetScreen nav={nav} />;
      case 'gameMode':
        return <GameModeScreen nav={nav} params={current.params} settings={settings} />;
      case 'shadowGame':
        return (
          <ShadowGameScreen
            nav={nav}
            params={current.params}
            settings={settings}
            onSessionComplete={handleSessionComplete}
          />
        );
      case 'shadowResult':
        return <ShadowResultScreen nav={nav} params={current.params} />;
      case 'achievements':
        return <AchievementsScreen nav={nav} badges={badges} stats={stats} />;
      case 'parentSettings':
        return (
          <ParentSettingsScreen
            nav={nav}
            settings={settings}
            setSettings={setSettings}
            stats={stats}
            onReset={handleReset}
          />
        );
      case 'home':
      default:
        return <ShadowHomeScreen nav={nav} />;
    }
  };

  return (
    <SafeAreaProvider>
      {/* Hide system bars for child-friendly fullscreen (sticky immersive on Android). */}
      <SystemBars hidden style="light" />
      <View style={styles.root}>{renderScreen()}</View>
    </SafeAreaProvider>
  );
}

/* ------------------------------------------------------------------ *
 *  Styles
 * ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.skyTop },
  safe: { flex: 1, backgroundColor: C.skyBottom },
  frame: { flex: 1, paddingHorizontal: 18, backgroundColor: C.skyBottom },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 6,
  },
  roundButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  roundButtonEmoji: { fontSize: 24, color: C.ink },

  /* Home */
  homeHeader: { alignItems: 'center', marginTop: 24 },
  homeStar: { fontSize: 84 },
  homeTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: C.ink,
    marginTop: 8,
    textAlign: 'center',
  },
  homeHint: { fontSize: 16, color: C.inkSoft, marginTop: 6, textAlign: 'center' },
  homeButtons: { flex: 1, justifyContent: 'center' },
  homeStart: { height: 120 },
  homeRow: { flexDirection: 'row', marginTop: 18 },
  homeHalf: { flex: 1, marginHorizontal: 6 },
  footNote: { textAlign: 'center', color: C.inkSoft, marginBottom: 12, fontSize: 13 },

  /* Buttons */
  bigButton: {
    borderRadius: 26,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bigButtonEmoji: { fontSize: 40 },
  bigButtonText: { fontSize: 22, fontWeight: '800', color: C.ink, marginTop: 4 },

  /* Generic screen */
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    marginVertical: 10,
  },
  subtleText: { textAlign: 'center', color: C.inkSoft, marginBottom: 10, fontSize: 15 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: C.inkSoft,
    marginTop: 14,
    marginBottom: 6,
    marginLeft: 4,
  },

  /* Object set grid */
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'center',
  },
  tile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: C.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tileEmoji: { fontSize: 76 },
  tileLabel: { fontSize: 20, fontWeight: '800', color: C.ink, marginTop: 8 },

  /* Mode / difficulty options */
  choiceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  optionCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 3,
    borderColor: C.border,
  },
  optionCardSmall: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 3,
    borderColor: C.border,
  },
  optionCardActive: { borderColor: C.sunDeep, backgroundColor: '#FFF6E6' },
  optionEmoji: { fontSize: 40 },
  optionText: { fontSize: 17, fontWeight: '700', color: C.ink, marginTop: 6 },
  optionTextSmall: { fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 4 },
  modeStart: { marginTop: 'auto', marginBottom: 16, height: 96 },

  /* Game */
  gameArea: { flex: 1 },
  boardFull: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  dotRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, marginHorizontal: 5 },

  shadowZone: {
    width: '92%',
    height: 250,
    borderRadius: 30,
    backgroundColor: C.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  dropZone: {
    borderWidth: 4,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  dragHint: { color: C.inkSoft, fontSize: 15, fontWeight: '700', marginTop: 10 },

  choicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 14,
  },
  choiceCard: {
    backgroundColor: C.card,
    borderRadius: 26,
    padding: 16,
    margin: 8,
    minWidth: 110,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  choiceCardSmall: { minWidth: 92, minHeight: 92, padding: 12, margin: 6 },
  choiceCardCorrect: { borderColor: C.good, backgroundColor: '#E9FBF1' },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    fontSize: 26,
    color: C.good,
    fontWeight: '900',
  },

  dragChip: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 12,
    margin: 8,
    minWidth: 96,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  dragChipSmall: { minWidth: 80, minHeight: 80, padding: 10, margin: 6 },
  dragChipSnapped: { borderColor: C.good, backgroundColor: '#E9FBF1' },

  /* Correct overlay */
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBubble: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: C.good,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  checkBig: { fontSize: 72, color: C.panel, fontWeight: '900' },
  checkWord: { fontSize: 22, color: C.panel, fontWeight: '800', marginTop: -6 },

  /* Result */
  resultWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resultEmoji: { fontSize: 80 },
  resultWord: { fontSize: 34, fontWeight: '900', color: C.ink, marginTop: 4 },
  starRow: { flexDirection: 'row', marginVertical: 14 },
  resultStar: { fontSize: 52, marginHorizontal: 4 },
  resultCount: { fontSize: 18, color: C.inkSoft, fontWeight: '700', marginBottom: 10 },
  resultButtons: { flexDirection: 'row', marginTop: 24, alignSelf: 'stretch' },
  newBadgeBox: {
    backgroundColor: C.panel,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 3,
    borderColor: C.sun,
  },
  newBadgeTitle: { fontSize: 16, fontWeight: '800', color: C.sunDeep },
  newBadgeRow: { flexDirection: 'row', marginTop: 6 },
  newBadgeEmoji: { fontSize: 40, marginHorizontal: 6 },

  /* Achievements */
  badgeScroll: { flex: 1 },
  badgeScrollContent: { paddingBottom: 20 },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.panel,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: C.border,
  },
  badgeCardLocked: { backgroundColor: C.panelSoft, opacity: 0.85 },
  badgeEmoji: { fontSize: 44, marginRight: 14 },
  badgeEmojiLocked: { opacity: 0.7 },
  badgeTextWrap: { flex: 1 },
  badgeTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  badgeDesc: { fontSize: 14, color: C.inkSoft, marginTop: 2 },
  badgeCheck: { fontSize: 28, color: C.good, fontWeight: '900', marginLeft: 8 },

  /* Settings */
  settingsContent: { paddingBottom: 28 },
  settingsCard: {
    backgroundColor: C.panel,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: C.border,
  },
  settingsRow: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1 },
  settingsLabel: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 8 },
  settingsHelp: { fontSize: 14, color: C.inkSoft, marginRight: 10 },
  statLine: { fontSize: 16, color: C.ink, marginTop: 4 },
  resetButton: {
    marginTop: 14,
    backgroundColor: C.panelSoft,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.border,
  },
  resetText: { fontSize: 16, fontWeight: '700', color: C.inkSoft },
  privacyText: { fontSize: 14, color: C.inkSoft, lineHeight: 21, marginTop: 4 },
});
