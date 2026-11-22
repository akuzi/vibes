import type { Color } from './chess';

export interface OpeningLine {
  id: string;
  name: string;
  moves: string[];
  /** Note attached to the move at a given ply index. */
  notes: Record<number, string>;
  /**
   * For sidelines: the ply where the opponent leaves the book (marked `?` or
   * `?!` in the source). The player's job is to punish it.
   */
  deviation?: number;
}

export interface Opening {
  id: string;
  name: string;
  eco: string;
  /** The side the player learns. */
  side: Color;
  family: 'e4' | 'd4' | 'flank';
  summary: string;
  lines: OpeningLine[];
}

/**
 * Lines are written as SAN separated by spaces. A `{comment}` attaches to the
 * move before it. Move numbers like `1.` are ignored. The first move annotated
 * with `?` marks the line as a sideline that deviates there.
 */
function line(id: string, name: string, pgn: string): OpeningLine {
  const moves: string[] = [];
  const notes: Record<number, string> = {};
  const re = /\{([^}]*)\}|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pgn))) {
    if (m[1] !== undefined) notes[moves.length - 1] = m[1].trim();
    else if (!/^\d+\.+$/.test(m[2])) moves.push(m[2]);
  }
  const deviation = moves.findIndex((san) => san.includes('?'));
  return { id, name, moves, notes, ...(deviation >= 0 ? { deviation } : {}) };
}

export const OPENINGS: Opening[] = [
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    eco: 'C60–C99',
    side: 'w',
    family: 'e4',
    summary:
      'The Spanish Game. White develops the bishop to b5 to pressure the knight that guards e5, building slow, lasting pressure.',
    lines: [
      line(
        'closed',
        'Closed Variation',
        `e4 {Grab the centre and open lines for the queen and bishop.} e5 Nf3 {Develop with tempo: e5 is attacked.} Nc6
         Bb5 {The Spanish bishop. It hits the defender of e5.} a6 {The Morphy Defence, asking the bishop a question.}
         Ba4 {Keep the pin-like pressure alive.} Nf6 O-O {Castle first — e4 is defended tactically.} Be7
         Re1 {Now e4 is properly protected.} b5 Bb3 d6 c3 {Prepare d4 and give the bishop a retreat on c2.} O-O
         h3 {Stops ...Bg4 before playing d4.}`,
      ),
      line(
        'berlin',
        'Berlin Defence',
        `e4 e5 Nf3 Nc6 Bb5 Nf6 {The Berlin Wall.} O-O Nxe4 {Black grabs the pawn, but it can be regained.}
         d4 {Open the centre while Black's king is still uncastled.} Nd6 Bxc6 dxc6 dxe5 Nf5
         Qxd8+ {Into the famous Berlin endgame.} Kxd8`,
      ),
      line(
        'exchange',
        'Exchange Variation',
        `e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 {Give up the bishop pair to damage Black's pawns.} dxc6
         O-O {Black can't win e4: Nxe5 would follow.} f6 d4 exd4 Nxd4 c5 Nb3
         Qxd1 Rxd1 {White aims for an endgame where the kingside majority counts.}`,
      ),
      line(
        'birds',
        "Bird's Defence",
        `e4 e5 Nf3 Nc6 Bb5 Nd4?! {Bird's Defence. Black moves the same knight twice and offers trades instead of developing.}
         Nxd4 {Take it. Black has to recapture with a pawn.} exd4 O-O {Castle, then go after the d4 pawn and open the centre.}
         Bc5 d3 c6 Ba4 Ne7 f4 {Grab kingside space while Black is still tangled up.}`,
      ),
    ],
  },
  {
    id: 'italian',
    name: 'Italian Game',
    eco: 'C50–C59',
    side: 'w',
    family: 'e4',
    summary:
      'White aims the bishop at f7, the weakest point in Black\'s camp. Quiet manoeuvring or sharp gambits — your choice.',
    lines: [
      line(
        'pianissimo',
        'Giuoco Pianissimo',
        `e4 e5 Nf3 Nc6 Bc4 {Eyeing f7.} Bc5 c3 {Prepare d4 one day.} Nf6 d3 {Solid: protect e4 and keep options.} d6
         O-O O-O Re1 a6 Bb3 {Avoid ...Na5 trading the bishop.} Ba7 h3 {Take g4 away from Black's pieces.}`,
      ),
      line(
        'two-knights',
        'Two Knights: Knight Attack',
        `e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 {Double attack on f7.} d5 exd5 Na5 {Best — Nxd5 allows the Fried Liver.}
         Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 {White is a pawn up; Black has active pieces.}`,
      ),
      line(
        'evans',
        'Evans Gambit',
        `e4 e5 Nf3 Nc6 Bc4 Bc5 b4 {Sacrifice a pawn to gain time for c3 and d4.} Bxb4 c3 Ba5
         d4 {Blow open the centre.} exd4 O-O {Development before material.}`,
      ),
      line(
        'fried-liver',
        'Fried Liver (5…Nxd5?!)',
        `e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5?! {Natural, but the d5 knight and the f7 square are now both loose.}
         Nxf7 {The Fried Liver sacrifice drags the king into the open.} Kxf7 Qf3+ {Check. With the king on e6, your c4 bishop pins the d5 knight.}
         Ke6 Nc3 {Pile up on the pinned knight.} Nb4 O-O c6 d4 {Open the centre. Black's king has nowhere to hide.}`,
      ),
      line(
        'blackburne',
        'Blackburne Shilling Trap',
        `e4 e5 Nf3 Nc6 Bc4 Nd4?! {The Blackburne Shilling Gambit. The e5 pawn is left hanging as bait.}
         Nxd4 {Calm and correct. The greedy Nxe5? walks into ...Qg5!, hitting the knight and g2 at once.} exd4
         O-O {Black has wasted time and has a weak d-pawn.} Bc5 c3 {Break open the centre while you lead in development.}
         dxc3 Nxc3 d6 d4 Bb6`,
      ),
    ],
  },
  {
    id: 'scotch',
    name: 'Scotch Game',
    eco: 'C44–C45',
    side: 'w',
    family: 'e4',
    summary: 'White strikes with d4 immediately, opening the centre and freeing the pieces.',
    lines: [
      line(
        'mieses',
        'Mieses Variation',
        `e4 e5 Nf3 Nc6 d4 {Challenge e5 right away.} exd4 Nxd4 Nf6 Nxc6 {Damage the pawn structure.} bxc6
         e5 {Kick the knight.} Qe7 Qe2 {Pin the pawn so it can be defended.} Nd5 c4 Ba6 b3`,
      ),
      line(
        'classical',
        'Classical Variation',
        `e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 {Protect the knight.} Qf6 c3 {Bolster d4.} Nge7 Bc4 O-O O-O`,
      ),
      line(
        'nxd4',
        'Early Knight Trade (3…Nxd4?!)',
        `e4 e5 Nf3 Nc6 d4 Nxd4?! {Trading knights only helps your queen reach the centre.}
         Nxd4 exd4 Qxd4 {A dominant queen, and there's no knight on c6 left to kick it.} d6 Bc4 Nf6 Nc3 Be7 O-O O-O`,
      ),
    ],
  },
  {
    id: 'kings-gambit',
    name: "King's Gambit",
    eco: 'C30–C39',
    side: 'w',
    family: 'e4',
    summary: 'The romantic gambit: give the f-pawn to rip open the f-file and seize the centre.',
    lines: [
      line(
        'kieseritzky',
        'Accepted: Kieseritzky',
        `e4 e5 f4 {Offer the f-pawn.} exf4 Nf3 {Stop ...Qh4+.} g5 {Hold on to the extra pawn.}
         h4 {Undermine the chain.} g4 Ne5 {The Kieseritzky knight.} Nf6 d4 d6 Nd3 Nxe4 Bxf4 {Material is level again.}`,
      ),
      line(
        'declined',
        'Classical Declined',
        `e4 e5 f4 Bc5 {Stops White from castling short for a while.} Nf3 d6 c3 {Prepare d4.} Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2`,
      ),
      line(
        'early-qh4',
        'Early Queen Check (2…Qh4+?!)',
        `e4 e5 f4 Qh4+?! {An early queen check that only helps you develop with tempo.}
         g3 {Block, and the queen has to move again.} Qe7 Nc3 {Defend e4 and develop.} exf4 d4 {Take the centre while Black's queen blocks the bishop.}`,
      ),
    ],
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    eco: 'D06–D69',
    side: 'w',
    family: 'd4',
    summary: 'White offers the c-pawn to deflect Black\'s d-pawn and win central control.',
    lines: [
      line(
        'qgd',
        'Declined: Orthodox',
        `d4 d5 c4 {The gambit — not really a sacrifice, as c4 can be regained.} e6 Nc3 Nf6
         Bg5 {Pin the knight defending d5.} Be7 e3 O-O Nf3 h6 Bh4 b6 {The Tartakower setup.}`,
      ),
      line(
        'qga',
        'Accepted',
        `d4 d5 c4 dxc4 {Black takes, but will give the pawn back.} Nf3 {Stop ...e5.} Nf6 e3 {Open the bishop to regain c4.} e6
         Bxc4 c5 O-O a6`,
      ),
      line(
        'qga-b5',
        'Greedy …b5 (QGA)',
        `d4 d5 c4 dxc4 e3 {Threatening Bxc4 to win the pawn back.}
         b5?! {Clinging to the extra pawn loosens the queenside and the long diagonal.} a4 {Undermine b5 at once.}
         c6 axb5 cxb5 Qf3 {Double attack: the a8 rook hangs on the long diagonal, and Black can't hold everything.}`,
      ),
    ],
  },
  {
    id: 'london',
    name: 'London System',
    eco: 'D02',
    side: 'w',
    family: 'd4',
    summary: 'A reliable system: same setup against almost anything — d4, Bf4, e3, c3, Nf3, Bd3.',
    lines: [
      line(
        'vs-d5',
        'vs ...d5 and ...c5',
        `d4 d5 Bf4 {Get the bishop out before e3 locks it in.} Nf6 e3 c5 c3 {The pyramid: d4 is rock solid.} Nc6
         Nd2 e6 Ngf3 Bd6 Bg3 {Keep the bishop rather than trade it.} O-O Bd3`,
      ),
      line(
        'vs-kid',
        'vs King\'s Indian setup',
        `d4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3 {A retreat square for the bishop on h2.} c5 c3`,
      ),
      line(
        'early-qb6',
        'Early …Qb6',
        `d4 d5 Bf4 c5 e3 Qb6?! {With your bishop gone from c1, Black's queen eyes the b2 pawn.}
         Nc3 {Ignore it. The b2 pawn is poisoned.} Qxb2 Nb5 {Now Nc7+ forks king and rook, and Rb1 can trap the queen.}`,
      ),
    ],
  },
  {
    id: 'english',
    name: 'English Opening',
    eco: 'A10–A39',
    side: 'w',
    family: 'flank',
    summary: 'Control d5 from the side with c4, then fianchetto the king\'s bishop for long-range pressure.',
    lines: [
      line(
        'reversed-sicilian',
        'Reversed Sicilian',
        `c4 e5 {A Sicilian with colours reversed — and an extra tempo for White.} Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5
         Bg2 {The bishop pins down the long diagonal.} Nb6 O-O Be7 d3 O-O`,
      ),
      line(
        'symmetrical',
        'Symmetrical',
        `c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 e6 O-O Nge7`,
      ),
      line(
        'early-d5',
        'Early …d5',
        `c4 d5?! {Black stakes out the centre too early. The pawn can be traded off and the queen dragged out.}
         cxd5 Qxd5 Nc3 {Develop with tempo on the queen.} Qa5 g3 {Fianchetto: the bishop will rake the long diagonal.} Nf6 Bg2 c6 Nf3`,
      ),
    ],
  },
  {
    id: 'najdorf',
    name: 'Sicilian Najdorf',
    eco: 'B90–B99',
    side: 'b',
    family: 'e4',
    summary:
      'The most analysed opening in chess. The little move ...a6 keeps every option open and fights for the initiative.',
    lines: [
      line(
        'english-attack',
        'English Attack',
        `e4 c5 {Fight for d4 asymmetrically.} Nf3 d6 d4 cxd4 {Trade a wing pawn for a central one.} Nxd4 Nf6 Nc3
         a6 {The Najdorf. Controls b5 and prepares ...e5.} Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7`,
      ),
      line(
        'bg5',
        '6.Bg5 Main Line',
        `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7`,
      ),
      line(
        'be2',
        'Opocensky (6.Be2)',
        `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 {Gain space, accepting a hole on d5.} Nb3 Be7 O-O O-O`,
      ),
      line(
        'qxd4',
        'Early Queen Recapture (4.Qxd4?!)',
        `e4 c5 Nf3 d6 d4 cxd4 Qxd4?! {The queen comes out early and can be chased around.}
         Nc6 {Develop with tempo.} Bb5 {White pins the knight to save the queen.} Bd7 Bxc6 Bxc6 {You keep the bishop pair, and your pieces come out fast.}`,
      ),
    ],
  },
  {
    id: 'dragon',
    name: 'Sicilian Dragon',
    eco: 'B70–B79',
    side: 'b',
    family: 'e4',
    summary: 'Black fianchettoes on g7, breathing fire down the long diagonal. Expect opposite-side castling races.',
    lines: [
      line(
        'yugoslav',
        'Yugoslav Attack',
        `e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 {The Dragon.} Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O
         Rc8 {Pile up on the c-file towards White's king.} Bb3 Ne5`,
      ),
      line(
        'qxd4',
        'Early Queen Recapture (4.Qxd4?!)',
        `e4 c5 Nf3 d6 d4 cxd4 Qxd4?! {The queen comes out early and can be chased around.}
         Nc6 {Develop with tempo.} Bb5 {White pins the knight to save the queen.} Bd7 Bxc6 Bxc6 {You get the bishop pair.}
         Nc3 Nf6 Bg5 e6 O-O-O Be7 {Solid development. Black's bishops will be strong later.}`,
      ),
    ],
  },
  {
    id: 'french',
    name: 'French Defence',
    eco: 'C00–C19',
    side: 'b',
    family: 'e4',
    summary: 'A solid wall with ...e6 and ...d5. Black concedes space, then attacks White\'s pawn chain at its base.',
    lines: [
      line(
        'advance',
        'Advance Variation',
        `e4 e6 d4 d5 e5 {Grab space.} c5 {Strike the base of the chain.} c3 Nc6 Nf3 Qb6 {Pile on d4.} a3 c4 Nbd2 Na5`,
      ),
      line(
        'winawer',
        'Winawer',
        `e4 e6 d4 d5 Nc3 Bb4 {Pin the knight and pressure e4.} e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 O-O`,
      ),
      line(
        'classical',
        'Classical',
        `e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5`,
      ),
      line(
        'early-bd3',
        'Early Bishop (3.Bd3?!)',
        `e4 e6 d4 d5 Bd3?! {The bishop guards e4, but it's a target and it blocks the d-pawn's support.}
         dxe4 {Take: now the bishop has to move a second time.} Bxe4 Nf6 {Develop with tempo.} Bf3 c5 {Hit the centre while White has lost time.}`,
      ),
    ],
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defence',
    eco: 'B10–B19',
    side: 'b',
    family: 'e4',
    summary: 'Like the French, but the light-squared bishop gets out before ...e6. Rock-solid structure.',
    lines: [
      line(
        'classical',
        'Classical',
        `e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 {Develop the "French bishop" first.} Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7
         Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7`,
      ),
      line(
        'advance',
        'Advance Variation',
        `e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 {Attack the chain.} Be3 Nd7 O-O Ne7`,
      ),
      line(
        'exchange',
        'Exchange Variation',
        `e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bxf3 Nxf3 Bd6 Bxd6 Qxd6`,
      ),
      line(
        'early-bc4',
        'Early Bishop (2.Bc4?!)',
        `e4 c6 Bc4?! {The bishop lands right where your planned ...d5 hits it.}
         d5 {Strike immediately.} exd5 cxd5 Bb3 {The bishop has moved twice.} Nf6 d4 Nc6 {An ideal setup, and you lead in development.}`,
      ),
      line(
        'qe2-trap',
        'Smothered Mate Trap (5.Qe2)',
        `e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2?! {A sneaky trap: the queen pins the e7 pawn and eyes d6.}
         Ndf6 {Safe. The natural Ngf6?? loses to Nd6#, a smothered mate!} Nxf6+ Nxf6 {Black is comfortable and White's queen is misplaced.}`,
      ),
    ],
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian Defence',
    eco: 'B01',
    side: 'b',
    family: 'e4',
    summary: 'Hit e4 immediately with ...d5. Simple to learn and forces White to play your game from move one.',
    lines: [
      line(
        'qa5',
        'Main Line (…Qa5)',
        `e4 d5 exd5 Qxd5 Nc3 Qa5 {Safe from attack, pins along the diagonal.} d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4`,
      ),
      line(
        'modern',
        'Modern (…Nf6)',
        `e4 d5 exd5 Nf6 {Regain the pawn with the knight.} d4 Nxd5 Nf3 Bg4 Be2 e6 O-O Nc6 c4 Nb6`,
      ),
      line(
        'e5-push',
        'Advance (2.e5?!)',
        `e4 d5 e5?! {White pushes past instead of taking, and the e5 pawn can become a target.}
         Bf5 {Get the bishop out before ...e6 locks it in.} d4 e6 Nf3 c5 {A French Advance, but your problem bishop is already outside the chain.}`,
      ),
    ],
  },
  {
    id: 'kings-indian',
    name: "King's Indian Defence",
    eco: 'E60–E99',
    side: 'b',
    family: 'd4',
    summary: 'Let White build a big centre, then hit back with ...e5 and a kingside pawn storm.',
    lines: [
      line(
        'classical',
        'Classical Main Line',
        `d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 {The thematic strike.} O-O Nc6 d5 Ne7 Ne1 Nd7 Nd3
         f5 {The kingside storm begins.}`,
      ),
      line(
        'samisch',
        'Sämisch',
        `d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 c5 Nge2 Nc6 d5 Ne5 Ng3 e6`,
      ),
      line(
        'exchange',
        'Exchange Variation (7.dxe5?!)',
        `d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 dxe5?! {Trading everything off. It looks safe, but it hands Black easy equality.}
         dxe5 Qxd8 Rxd8 {Your rook takes the open d-file.} Bg5 Re8 {Step out of the pin.} Nd5 Nxd5 cxd5 c6 {Challenge the d5 pawn straight away.}`,
      ),
    ],
  },
  {
    id: 'nimzo-indian',
    name: 'Nimzo-Indian Defence',
    eco: 'E20–E59',
    side: 'b',
    family: 'd4',
    summary: 'Pin the c3 knight to stop e4. Black happily trades bishop for knight to damage White\'s pawns.',
    lines: [
      line(
        'classical',
        'Classical (4.Qc2)',
        `d4 Nf6 c4 e6 Nc3 Bb4 {The Nimzo pin.} Qc2 {Recapture with the queen to keep the pawns intact.} O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 e3 d6`,
      ),
      line(
        'rubinstein',
        'Rubinstein (4.e3)',
        `d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3 dxc4 Bxc4 Qc7`,
      ),
      line(
        'spielmann',
        'Spielmann (4.Qb3?!)',
        `d4 Nf6 c4 e6 Nc3 Bb4 Qb3?! {The queen protects the knight, but it leaves d4 short of defenders.}
         c5 {Hit d4 at once.} dxc5 Nc6 {Develop with tempo, eyeing d4.} Nf3 Ne4 {Jump into the centre and pressure c3 again.} Bd2 Nxd2 Nxd2 O-O`,
      ),
    ],
  },
  {
    id: 'slav',
    name: 'Slav Defence',
    eco: 'D10–D19',
    side: 'b',
    family: 'd4',
    summary: 'Defend d5 with the c-pawn, keeping the c8 bishop free to develop.',
    lines: [
      line(
        'main',
        'Main Line',
        `d4 d5 c4 c6 {Support d5 without blocking the bishop.} Nf3 Nf6 Nc3 dxc4 a4 {Stop ...b5.} Bf5
         e3 e6 Bxc4 Bb4 O-O O-O Qe2 Nbd7`,
      ),
      line(
        'exchange',
        'Exchange Variation',
        `d4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Bf4 Nc6 e3 Bf5 Nf3 e6`,
      ),
      line(
        'early-qb3',
        'Early Queen (4.Qb3?!)',
        `d4 d5 c4 c6 Nf3 Nf6 Qb3?! {An early queen sortie that takes the c4 pawn's defence for granted.}
         dxc4 {Take it. The queen must spend another move recapturing.} Qxc4 Bf5 {Develop the bishop before ...e6 locks it in.} Nc3 e6`,
      ),
    ],
  },
];

export const openingById = (id: string) => OPENINGS.find((o) => o.id === id);
