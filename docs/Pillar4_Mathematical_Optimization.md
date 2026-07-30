# Mathematical Optimization of Pillar 4: Small-Cluster Matches

This document explains how to mathematically model and optimize the constraints outlined in **Point 7 (Pillar 4)** of the MatchFIT Five-Pillar Programme. 

The process involves two main combinatorial optimization problems:
1. **The Substitution & Minutes Equity Problem (Section 7.1)**
2. **The Round-Robin Match Scheduling Problem (Section 7.2)**

---

## 1. The Substitution & Minutes Equity Problem (7.1)

**The Goal:** Within each squad of 5 players, field a 4-player team and rotate 1 substitute periodically. We must ensure every player's play time stays within the 0.90 to 1.10 equity band, while avoiding consecutive benchings.

### Mathematical Formulation

Let $P$ be the set of players in a squad (typically $|P| = 5$).
Let $I$ be the total number of rotation intervals (e.g., if a match is 15 minutes with 3-minute intervals, $I=5$).

**Decision Variables:**
Let $x_{p,i} \in \{0, 1\}$ equal 1 if player $p$ plays in interval $i$, and 0 if they are subbed off (benched).

**Constants & State:**
- $H_p$: Historical minutes played by player $p$ (carried over from previous sessions).
- $T_i$: The duration in minutes of interval $i$.
- $F_p \in \{0, 1\}$: Fatigue/Injury flag (1 if they are allowed to rest consecutively).

**Objective Function:**
Minimize the variance in total minutes played across all players to maintain the 0.90 - 1.10 equity target:
$$ \min \sum_{p \in P} \left( \frac{\text{Total}(p)}{\text{AvgSquadMinutes}} - 1.0 \right)^2 $$
Where $\text{Total}(p) = H_p + \sum_{i \in I} (x_{p,i} \times T_i)$

**Constraints:**
1. **Squad Size Constraint:** Exactly 4 players must be on the pitch during every interval.
   $$ \sum_{p \in P} x_{p,i} = 4 \quad \forall i \in I $$

2. **No Consecutive Benchings Constraint:** A player cannot be benched two intervals in a row unless they are fatigued/injured.
   $$ x_{p,i} + x_{p,i+1} \ge 1 \quad \forall p \in P \text{ where } F_p = 0 $$

### Algorithmic Solution (Greedy Heuristic)
For real-time MVP performance, we don't need a heavy ILP solver. We can use a **Greedy Algorithm**:
1. Before every interval $i$, calculate current $E(p)$ (Minutes Equity) for all players.
2. Filter out any player who was benched in interval $i-1$ (unless $F_p = 1$).
3. Sort the remaining eligible players by highest $E(p)$ descending.
4. Bench the player at the top of the list (highest playtime).

---

## 2. The Match Scheduling Problem (7.2)

**The Goal:** Schedule a round-robin tournament for $T$ teams (e.g., 6 squads: A-F) over $R$ rounds on $K$ available pitches, minimizing rest inequalities, repeat match-ups, and blowout games.

### Mathematical Formulation

Let $S$ be the set of 6 squads $\{s_1, s_2, \dots, s_6\}$.
Let $R$ be the set of match rounds.
Let $K$ be the number of simultaneous pitches (e.g., $K=2$, meaning 4 teams play, 2 rest per round).

**Decision Variables:**
Let $y_{a,b,r} \in \{0, 1\}$ equal 1 if squad $a$ plays squad $b$ in round $r$, and 0 otherwise.

**Cost Penalties (Weights):**
- $W_{\text{rest}}$: Penalty for playing $>2$ consecutive rounds without rest.
- $W_{\text{wait}}$: Penalty for resting $>1$ consecutive round.
- $W_{\text{repeat}}$: Penalty for playing the same opponent twice.
- $W_{\text{mismatch}}$: Penalty multiplier based on the difference in composite Elo ratings between squad $a$ and squad $b$.

**Objective Function (Cost Minimization):**
$$ \min \sum_{r \in R} \Big( \text{RestPenalty}(r) + \text{WaitPenalty}(r) + \sum_{a,b} (y_{a,b,r} \times \text{MismatchPenalty}(a,b) \times W_{\text{repeat}}(a,b)) \Big) $$

**Constraints:**
1. **Pitch Capacity:** No more than $K$ games can happen per round.
   $$ \sum_{a,b} y_{a,b,r} \le K \quad \forall r \in R $$
2. **Single Match Per Round:** A team can only play 1 game per round.
   $$ \sum_{b \in S} y_{a,b,r} \le 1 \quad \forall a \in S, \forall r \in R $$

### Algorithmic Solution (Simulated Annealing or Template Matching)
Since generating perfect schedules dynamically can be computationally expensive (NP-Hard):
1. **MVP Approach (Template Matching):** Pre-calculate a mathematically perfect 6-team, 2-pitch rotation matrix. Map the current squads (A-F) to the template by sorting them by Average Squad Rating. Map them so that extreme mismatches (e.g., Rank 1 vs Rank 6) occur less often than competitive matches.
2. **Advanced Approach:** Use Simulated Annealing. Generate a random schedule, calculate the Cost Function, swap two matches randomly, and keep the new schedule if the Cost is lower. Repeat 1000 times (takes <10ms in JavaScript).
