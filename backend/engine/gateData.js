// GATE data used by the GATE planning engine.
//
// Expected marks are planning estimates supplied for StudySync, based on a
// claimed 2023–2025 average. They are not official chapter-wise weightage and
// must not be presented as guaranteed marks.
//
// Chapter hours are StudySync planning estimates, not published GATE figures.
// They can be changed by a student through overrides.hours.
//
// The chapter labels below follow the broad topics in the official GATE 2027
// CS syllabus. The workload estimates and expected subject marks remain
// estimates. Official syllabus: https://gate2027.iitm.ac.in/

export const GATE_DATA = {
  CS: {
    paperName: "Computer Science and Information Technology (CS)",
    source:
      "Expected marks: StudySync estimates based on the supplied 2023–2025 averages (GO Classes analysis); chapter hours are planning estimates. Not guarantees.",
    order: ["pds", "dm", "em", "algo", "dl", "coa", "os", "toc", "cd", "dbms", "cn", "ga"],
    subjects: [
      {
        id: "ga",
        name: "General Aptitude",
        marks: 15,
        parallel: true,
        chapters: [
          { id: "ga-verbal", name: "Verbal ability", hours: 12 },
          { id: "ga-quant", name: "Quantitative aptitude", hours: 18 },
          { id: "ga-reason", name: "Analytical and spatial reasoning", hours: 12 },
        ],
      },
      {
        id: "dm",
        name: "Discrete Mathematics",
        marks: 5.3,
        chapters: [
          { id: "dm-logic", name: "Propositional and first-order logic", hours: 6, basic: true },
          {
            id: "dm-sets",
            name: "Sets, relations, functions, partial orders, lattices, monoids and groups",
            hours: 10,
            requires: ["dm-logic"],
          },
          { id: "dm-graph", name: "Graph theory: connectivity, matching and colouring", hours: 12 },
          { id: "dm-comb", name: "Combinatorics, counting, recurrences and generating functions", hours: 10 },
        ],
      },
      {
        id: "em",
        name: "Engineering Mathematics",
        marks: 6.3,
        chapters: [
          {
            id: "em-la",
            name: "Linear algebra: matrices, determinants, linear systems, eigenvalues and LU decomposition",
            hours: 10,
          },
          {
            id: "em-prob",
            name: "Probability and statistics: distributions, summary statistics, conditional probability and Bayes' theorem",
            hours: 14,
          },
          {
            id: "em-calc",
            name: "Calculus: limits, continuity, differentiability, extrema, mean value theorem and integration",
            hours: 8,
          },
        ],
      },
      {
        id: "dl",
        name: "Digital Logic",
        marks: 5.7,
        chapters: [
          {
            id: "dl-num",
            name: "Number representation and fixed-/floating-point arithmetic",
            hours: 4,
            basic: true,
          },
          {
            id: "dl-bool",
            name: "Boolean algebra and minimization (K-map and tabular methods)",
            hours: 6,
            basic: true,
          },
          { id: "dl-comb", name: "Combinational circuit design", hours: 8, requires: ["dl-bool"] },
          { id: "dl-seq", name: "Sequential circuit design", hours: 8, requires: ["dl-comb"] },
        ],
      },
      {
        id: "coa",
        name: "Computer Organization and Architecture",
        marks: 9.7,
        chapters: [
          { id: "coa-isa", name: "Instruction sets and addressing modes", hours: 8, basic: true },
          {
            id: "coa-cpu",
            name: "ALU and hardwired/microprogrammed control units",
            hours: 8,
            requires: ["coa-isa"],
          },
          { id: "coa-pipe", name: "Instruction pipelining and hazards", hours: 10, requires: ["coa-cpu"] },
          {
            id: "coa-mem",
            name: "Memory interfacing, hierarchy, performance and cache mapping",
            hours: 12,
            requires: ["coa-isa"],
          },
          { id: "coa-io", name: "I/O interface, interrupts and DMA", hours: 6 },
        ],
      },
      {
        id: "pds",
        name: "Programming and Data Structures",
        marks: 9.7,
        chapters: [
          { id: "pds-c", name: "Programming in C and recursion", hours: 14, basic: true },
          {
            id: "pds-ds",
            name: "Arrays, stacks, queues and linked lists",
            hours: 12,
            basic: true,
            requires: ["pds-c"],
          },
          { id: "pds-tree", name: "Trees, binary search trees and binary heaps", hours: 12, requires: ["pds-ds"] },
          { id: "pds-hash", name: "Hashing and graph data structures", hours: 8, requires: ["pds-ds"] },
        ],
      },
      {
        id: "algo",
        name: "Algorithms",
        marks: 7.3,
        chapters: [
          { id: "algo-asym", name: "Asymptotic worst-case time and space complexity", hours: 6, basic: true },
          {
            id: "algo-dc",
            name: "Searching, sorting, hashing and divide-and-conquer",
            hours: 10,
            requires: ["algo-asym", "pds-ds"],
          },
          { id: "algo-greedy", name: "Greedy algorithm design", hours: 8, requires: ["algo-asym"] },
          {
            id: "algo-graph",
            name: "Graph traversals, minimum spanning trees and shortest paths",
            hours: 12,
            requires: ["pds-tree", "algo-asym"],
          },
          { id: "algo-dp", name: "Dynamic programming", hours: 14, requires: ["algo-asym"] },
        ],
      },
      {
        id: "toc",
        name: "Theory of Computation",
        marks: 8.3,
        chapters: [
          { id: "toc-reg", name: "Regular expressions, languages and finite automata", hours: 12, basic: true },
          { id: "toc-cfg", name: "Context-free grammars, PDA and pumping lemma", hours: 12, requires: ["toc-reg"] },
          { id: "toc-tm", name: "Turing machines and undecidability", hours: 12, requires: ["toc-cfg"] },
        ],
      },
      {
        id: "cd",
        name: "Compiler Design",
        marks: 6.0,
        chapters: [
          { id: "cd-lex", name: "Lexical analysis", hours: 4, requires: ["toc-reg"] },
          { id: "cd-parse", name: "Parsing and syntax-directed translation", hours: 14, requires: ["toc-cfg"] },
          { id: "cd-sdt", name: "Intermediate code generation and runtime environments", hours: 8, requires: ["cd-parse"] },
          {
            id: "cd-opt",
            name: "Local optimization and data-flow analysis",
            hours: 8,
            requires: ["cd-sdt"],
          },
        ],
      },
      {
        id: "os",
        name: "Operating Systems",
        marks: 8.3,
        chapters: [
          {
            id: "os-proc",
            name: "System calls, processes, threads, IPC and CPU/I/O scheduling",
            hours: 10,
            basic: true,
          },
          { id: "os-sync", name: "Concurrency, synchronization and deadlocks", hours: 14, requires: ["os-proc"] },
          { id: "os-mem", name: "Memory management and virtual memory", hours: 12, requires: ["os-proc"] },
          { id: "os-file", name: "File systems", hours: 8 },
        ],
      },
      {
        id: "dbms",
        name: "Databases",
        marks: 7.0,
        chapters: [
          { id: "db-er", name: "ER model and relational model", hours: 8, basic: true },
          { id: "db-sql", name: "Relational algebra, tuple calculus and SQL", hours: 8, requires: ["db-er"] },
          { id: "db-norm", name: "Integrity constraints and normal forms", hours: 10, requires: ["db-er"] },
          { id: "db-txn", name: "Transactions and concurrency control", hours: 12, requires: ["db-er"] },
          { id: "db-idx", name: "File organization and indexing (B/B+ trees)", hours: 8, requires: ["pds-tree"] },
        ],
      },
      {
        id: "cn",
        name: "Computer Networks",
        marks: 8.3,
        chapters: [
          {
            id: "cn-link",
            name: "Layering, switching, performance metrics and data-link layer",
            hours: 10,
            basic: true,
          },
          {
            id: "cn-net",
            name: "Error detection, Ethernet, routing, IPv4, CIDR and NAT",
            hours: 14,
            requires: ["cn-link"],
          },
          {
            id: "cn-trans",
            name: "TCP flow/congestion control and socket API",
            hours: 12,
            requires: ["cn-net"],
          },
          { id: "cn-app", name: "Application layer: DNS and HTTP", hours: 6, requires: ["cn-trans"] },
        ],
      },
    ],
  },
  EE: {
    paperName: "Electrical Engineering (EE)",
    source:
      "Syllabus: official GATE 2027 EE syllabus (IIT Madras). Expected marks: historical classification of official 2024–2026 papers, normalized to 13 marks for Engineering Mathematics and 72 for other technical sections; estimates, not guarantees. Chapter hours are StudySync planning estimates.",
    order: ["ee-math", "ee-circuits", "ee-emf", "ee-signals", "ee-machines", "ee-power-systems", "ee-control", "ee-measurements", "ee-analog-digital", "ee-power-electronics", "ga"],
    subjects: [
      {
        id: "ga", name: "General Aptitude", marks: 15, parallel: true,
        chapters: [
          { id: "ga-verbal", name: "Verbal ability", hours: 12 },
          { id: "ga-quant", name: "Quantitative aptitude", hours: 18 },
          { id: "ga-reason", name: "Analytical and spatial reasoning", hours: 12 },
        ],
      },
      {
        id: "ee-math", name: "Engineering Mathematics", marks: 13,
        chapters: [
          { id: "ee-math-la", name: "Linear algebra: matrices, systems of equations, eigenvalues and eigenvectors", hours: 10, basic: true },
          { id: "ee-math-calculus", name: "Calculus, vector identities, multiple and line/surface/volume integrals", hours: 12 },
          { id: "ee-math-de", name: "Differential equations: first/higher order ODEs and partial differential equations", hours: 10 },
          { id: "ee-math-complex", name: "Complex variables: analytic functions, Cauchy theorems, series and residues", hours: 8 },
          { id: "ee-math-prob", name: "Probability and statistics: distributions, sampling, correlation and regression", hours: 8 },
        ],
      },
      {
        id: "ee-circuits", name: "Electric Circuits", marks: 7.9,
        chapters: [
          { id: "ee-circuit-elements", name: "Network elements and KCL/KVL; node and mesh analysis", hours: 8, basic: true },
          { id: "ee-circuit-theorems", name: "Thevenin, Norton, superposition and maximum power transfer", hours: 8, requires: ["ee-circuit-elements"] },
          { id: "ee-circuit-transients", name: "DC/AC transients, sinusoidal steady state and resonance", hours: 10, requires: ["ee-circuit-elements"] },
          { id: "ee-circuit-threephase", name: "Two-port networks, three-phase circuits, star-delta and complex power", hours: 10, requires: ["ee-circuit-theorems"] },
        ],
      },
      {
        id: "ee-emf", name: "Electromagnetic Fields", marks: 5.8,
        chapters: [
          { id: "ee-emf-electric", name: "Coulomb's law, electric fields, Gauss's law, potential and capacitance", hours: 8, basic: true },
          { id: "ee-emf-magnetic", name: "Biot–Savart and Ampere laws, Faraday law, inductance and magnetic circuits", hours: 8, requires: ["ee-emf-electric"] },
        ],
      },
      {
        id: "ee-signals", name: "Signals and Systems", marks: 8.2,
        chapters: [
          { id: "ee-signals-basics", name: "Continuous/discrete signals, shifting, scaling, LTI and causal systems", hours: 8, basic: true },
          { id: "ee-signals-fourier", name: "Fourier series and Fourier transform applications", hours: 10, requires: ["ee-signals-basics"] },
          { id: "ee-signals-laplace-z", name: "Laplace and Z transforms; sampling theorem", hours: 10, requires: ["ee-signals-basics"] },
        ],
      },
      {
        id: "ee-machines", name: "Electrical Machines", marks: 8.9,
        chapters: [
          { id: "ee-mach-transformer", name: "Single/three-phase transformers, tests, regulation and efficiency", hours: 10, basic: true },
          { id: "ee-mach-dc", name: "DC machines, characteristics, motoring/generating and speed control", hours: 10 },
          { id: "ee-mach-induction", name: "Three-phase and single-phase induction machines, tests and equivalent circuit", hours: 12 },
          { id: "ee-mach-sync", name: "Synchronous machines, regulation, parallel operation and starting", hours: 12 },
          { id: "ee-mach-energy", name: "Electromechanical energy conversion, losses and efficiency", hours: 6 },
        ],
      },
      {
        id: "ee-power-systems", name: "Power Systems", marks: 10.5,
        chapters: [
          { id: "ee-ps-basics", name: "Generation, AC/DC transmission, lines, cables and distribution", hours: 8, basic: true },
          { id: "ee-ps-loadflow", name: "Per-unit quantities, bus admittance and load-flow methods", hours: 12, requires: ["ee-ps-basics"] },
          { id: "ee-ps-dispatch", name: "Economic load dispatch, compensation, voltage/frequency control and power factor", hours: 10, requires: ["ee-ps-loadflow"] },
          { id: "ee-ps-faults", name: "Symmetrical components, fault analysis, relays and circuit breakers", hours: 12, requires: ["ee-ps-basics"] },
          { id: "ee-ps-stability", name: "System stability, equal-area criterion, insulators and field distribution", hours: 8 },
        ],
      },
      {
        id: "ee-control", name: "Control Systems", marks: 8.2,
        chapters: [
          { id: "ee-control-models", name: "Mathematical models, transfer functions, block diagrams and signal-flow graphs", hours: 8, basic: true },
          { id: "ee-control-response", name: "Transient and steady-state analysis of LTI systems", hours: 8, requires: ["ee-control-models"] },
          { id: "ee-control-stability", name: "Routh–Hurwitz and Nyquist stability criteria", hours: 10, requires: ["ee-control-models"] },
          { id: "ee-control-frequency", name: "Bode plots, root locus, lag/lead compensators and PID control", hours: 10, requires: ["ee-control-stability"] },
          { id: "ee-control-state", name: "State-space models and state equations", hours: 8, requires: ["ee-control-models"] },
        ],
      },
      {
        id: "ee-measurements", name: "Electrical and Electronic Measurements", marks: 3.4,
        chapters: [
          { id: "ee-meas-bridges", name: "Bridges, potentiometers and error analysis", hours: 6, basic: true },
          { id: "ee-meas-power", name: "Measurement of voltage, current, power, energy and power factor", hours: 6 },
          { id: "ee-meas-instruments", name: "Instrument transformers, digital meters, oscilloscopes and time/frequency measurement", hours: 6 },
        ],
      },
      {
        id: "ee-analog-digital", name: "Analog and Digital Electronics", marks: 8.9,
        chapters: [
          { id: "ee-ad-diode", name: "Diode circuits: clipping, clamping and rectifiers", hours: 6, basic: true },
          { id: "ee-ad-amplifiers", name: "Amplifiers, biasing, frequency response, oscillators and feedback", hours: 10 },
          { id: "ee-ad-opamp", name: "Operational amplifiers, active filters, Sallen–Key and Butterworth filters", hours: 8 },
          { id: "ee-ad-digital", name: "Combinational/sequential logic, multiplexers, demultiplexers and Schmitt triggers", hours: 8 },
        ],
      },
      {
        id: "ee-power-electronics", name: "Power Electronics", marks: 10.2,
        chapters: [
          { id: "ee-pe-devices", name: "Thyristor, MOSFET and IGBT characteristics and gate/firing circuits", hours: 8, basic: true },
          { id: "ee-pe-dcdc", name: "Buck, boost and buck-boost DC–DC converters", hours: 8 },
          { id: "ee-pe-rectifiers", name: "Single/three-phase rectifiers and converter characteristics", hours: 10 },
          { id: "ee-pe-commutation", name: "Current/voltage commutated thyristor converters and harmonics", hours: 8 },
          { id: "ee-pe-inverters", name: "Single/three-phase inverters, current-source converters and sinusoidal PWM", hours: 10 },
        ],
      },
    ],
  },
  EC: {
    paperName: "Electronics and Communication Engineering (EC)",
    source:
      "Syllabus: official GATE 2027 EC syllabus (IIT Madras, revised). Expected marks: historical classification of official 2024–2026 papers, normalized to the fixed 13-mark Engineering Mathematics block and 72 other technical marks; estimates, not guarantees. Chapter hours are StudySync planning estimates.",
    order: ["ec-math", "ec-net-signals", "ec-devices", "ec-analog", "ec-digital", "ec-control", "ec-communications", "ec-em", "ga"],
    subjects: [
      {
        id: "ga", name: "General Aptitude", marks: 15, parallel: true,
        chapters: [
          { id: "ga-verbal", name: "Verbal ability", hours: 12 },
          { id: "ga-quant", name: "Quantitative aptitude", hours: 18 },
          { id: "ga-reason", name: "Analytical and spatial reasoning", hours: 12 },
        ],
      },
      {
        id: "ec-math", name: "Engineering Mathematics", marks: 13,
        chapters: [
          { id: "ec-math-la", name: "Linear algebra: vector spaces, matrices, eigenvalues and systems of equations", hours: 10, basic: true },
          { id: "ec-math-calculus", name: "Calculus, multiple integrals, Taylor series and extrema", hours: 12 },
          { id: "ec-math-de", name: "Differential equations and boundary/initial value problems", hours: 10 },
          { id: "ec-math-vector", name: "Vector analysis: gradient, divergence, curl and integral theorems", hours: 8 },
          { id: "ec-math-complex-prob", name: "Complex analysis, probability, distributions and regression", hours: 12 },
        ],
      },
      {
        id: "ec-net-signals", name: "Networks, Signals and Systems", marks: 15.9,
        chapters: [
          { id: "ec-ns-circuits", name: "Circuit analysis: node/mesh, network theorems, phasors and power", hours: 10, basic: true },
          { id: "ec-ns-transients", name: "RL/RC/RLC networks, Laplace analysis, two-port parameters and wye-delta", hours: 10, requires: ["ec-ns-circuits"] },
          { id: "ec-ns-lti", name: "LTI system properties, convolution, causality, stability and frequency response", hours: 10 },
          { id: "ec-ns-ct", name: "Continuous-time signals, Fourier series/transform, sampling and reconstruction", hours: 8 },
          { id: "ec-ns-dt", name: "DTFT, DFT, Z-transform, FIR and IIR filter design", hours: 10, requires: ["ec-ns-ct"] },
        ],
      },
      {
        id: "ec-devices", name: "Electronic Devices", marks: 8.5,
        chapters: [
          { id: "ec-dev-bands", name: "Energy bands, intrinsic/extrinsic semiconductors and carrier concentration", hours: 8, basic: true },
          { id: "ec-dev-transport", name: "Drift/diffusion current, mobility, generation/recombination and carrier equations", hours: 8, requires: ["ec-dev-bands"] },
          { id: "ec-dev-junction", name: "PN junction, Zener diode and semiconductor device fundamentals", hours: 8, requires: ["ec-dev-transport"] },
          { id: "ec-dev-transistors", name: "BJT, MOS capacitor, MOSFET and MOSFET scaling", hours: 10, requires: ["ec-dev-junction"] },
          { id: "ec-dev-opto", name: "LEDs, photodiodes and solar cells", hours: 6 },
        ],
      },
      {
        id: "ec-analog", name: "Analog Circuits", marks: 11.4,
        chapters: [
          { id: "ec-analog-diode", name: "Diode clipping, clamping and rectifier circuits", hours: 6, basic: true },
          { id: "ec-analog-bjt-mos", name: "BJT/MOSFET amplifier biasing, small-signal analysis and frequency response", hours: 12 },
          { id: "ec-analog-opamp", name: "Op-amp amplifiers, summers, differentiators, integrators and active filters", hours: 10 },
          { id: "ec-analog-feedback", name: "Current mirrors, differential amplifiers, oscillators and feedback compensation", hours: 8 },
        ],
      },
      {
        id: "ec-digital", name: "Digital Circuits", marks: 10.7,
        chapters: [
          { id: "ec-digital-number", name: "Binary/integer/floating-point representation and arithmetic", hours: 4, basic: true },
          { id: "ec-digital-boolean", name: "Boolean algebra, K-maps and static CMOS logic", hours: 6, basic: true },
          { id: "ec-digital-comb", name: "Combinational circuits, arithmetic, code converters, multiplexers and decoders", hours: 8, requires: ["ec-digital-boolean"] },
          { id: "ec-digital-seq", name: "Latches, flip-flops, counters, shift registers, FSMs and timing", hours: 8, requires: ["ec-digital-comb"] },
          { id: "ec-digital-converters-memory", name: "ADC/DAC, sample-and-hold, semiconductor memories and basic computer organization", hours: 8 },
        ],
      },
      {
        id: "ec-control", name: "Control Systems", marks: 8.1,
        chapters: [
          { id: "ec-control-model", name: "Control components, feedback, transfer functions and signal-flow graphs", hours: 8, basic: true },
          { id: "ec-control-response", name: "Transient/steady-state analysis and frequency response", hours: 8, requires: ["ec-control-model"] },
          { id: "ec-control-stability", name: "Routh–Hurwitz, Nyquist, Bode plots and root locus", hours: 10, requires: ["ec-control-model"] },
          { id: "ec-control-compensation", name: "Compensators, PID control and state-variable models", hours: 12, requires: ["ec-control-stability"] },
        ],
      },
      {
        id: "ec-communications", name: "Communications", marks: 10.5,
        chapters: [
          { id: "ec-comm-random", name: "Random processes, autocorrelation, PSD and filtering of random signals", hours: 8, basic: true },
          { id: "ec-comm-analog", name: "Amplitude/angle modulation, demodulation and superheterodyne receivers", hours: 8 },
          { id: "ec-comm-info", name: "Entropy, source coding, mutual information and channel capacity", hours: 8 },
          { id: "ec-comm-digital", name: "PCM/DPCM, ASK/PSK/FSK/QAM, ISI, detection, SNR/BER, Hamming codes and CRC", hours: 14 },
        ],
      },
      {
        id: "ec-em", name: "Electromagnetics", marks: 6.9,
        chapters: [
          { id: "ec-em-maxwell", name: "Maxwell equations, boundary conditions, wave equation and Poynting vector", hours: 8, basic: true },
          { id: "ec-em-waves", name: "Plane waves, polarization, reflection/refraction and propagation media", hours: 10 },
          { id: "ec-em-transmission", name: "Transmission lines, impedance matching, S-parameters and Smith chart", hours: 10 },
          { id: "ec-em-guides-antennas", name: "Waveguides, optical fibres, dipole/monopole antennas and arrays", hours: 8 },
        ],
      },
    ],
  },
  DA: {
    paperName: "Data Science and Artificial Intelligence (DA)",
    source:
      "Syllabus: official GATE 2027 DA syllabus (IIT Madras). Expected marks: averages from question-by-question classification of official 2024–2026 papers; adjusted for rounding to total 85 subject marks. The exam does not publish official section-wise weightage. Chapter hours are StudySync planning estimates; estimates, not guarantees.",
    order: ["da-prob", "da-dsa", "da-ml", "da-db", "da-la", "da-ai", "da-calculus", "ga"],
    subjects: [
      {
        id: "ga", name: "General Aptitude", marks: 15, parallel: true,
        chapters: [
          { id: "ga-verbal", name: "Verbal ability", hours: 12 },
          { id: "ga-quant", name: "Quantitative aptitude", hours: 18 },
          { id: "ga-reason", name: "Analytical and spatial reasoning", hours: 12 },
        ],
      },
      {
        id: "da-prob", name: "Probability and Statistics", marks: 18.3,
        chapters: [
          { id: "da-prob-counting", name: "Counting, probability axioms, sample spaces and conditional probability", hours: 10, basic: true },
          { id: "da-prob-rv", name: "Random variables, expectation, variance, PMFs and distribution functions", hours: 12, requires: ["da-prob-counting"] },
          { id: "da-prob-distributions", name: "Uniform, Bernoulli, binomial, Poisson, exponential, normal, t and chi-squared distributions", hours: 12, requires: ["da-prob-rv"] },
          { id: "da-prob-inference", name: "Descriptive statistics, correlation/covariance, CLT, confidence intervals and hypothesis tests", hours: 12, requires: ["da-prob-rv"] },
        ],
      },
      {
        id: "da-la", name: "Linear Algebra", marks: 10,
        chapters: [
          { id: "da-la-matrices", name: "Vector spaces, subspaces, linear dependence and matrix algebra", hours: 10, basic: true },
          { id: "da-la-systems", name: "Linear systems, Gaussian elimination, rank and nullity", hours: 8, requires: ["da-la-matrices"] },
          { id: "da-la-eigen", name: "Eigenvalues/eigenvectors, projections, quadratic forms and orthogonal matrices", hours: 10, requires: ["da-la-matrices"] },
          { id: "da-la-decomp", name: "LU decomposition, singular value decomposition and projection matrices", hours: 8, requires: ["da-la-systems"] },
        ],
      },
      {
        id: "da-calculus", name: "Calculus and Optimization", marks: 6.4,
        chapters: [
          { id: "da-calculus-basics", name: "Single-variable functions, limits, continuity and differentiability", hours: 8, basic: true },
          { id: "da-calculus-opt", name: "Taylor series, maxima/minima and single-variable optimization", hours: 8, requires: ["da-calculus-basics"] },
        ],
      },
      {
        id: "da-dsa", name: "Programming, Data Structures and Algorithms", marks: 16,
        chapters: [
          { id: "da-dsa-python", name: "Python programming fundamentals", hours: 8, basic: true },
          { id: "da-dsa-structures", name: "Stacks, queues, linked lists, trees and hash tables", hours: 10, requires: ["da-dsa-python"] },
          { id: "da-dsa-search-sort", name: "Linear/binary search, elementary sorting, mergesort and quicksort", hours: 10, requires: ["da-dsa-structures"] },
          { id: "da-dsa-graphs", name: "Divide and conquer, graph traversals and shortest-path algorithms", hours: 12, requires: ["da-dsa-structures"] },
        ],
      },
      {
        id: "da-db", name: "Database Management and Warehousing", marks: 12,
        chapters: [
          { id: "da-db-model", name: "ER/relational models, relational algebra, tuple calculus and SQL", hours: 10, basic: true },
          { id: "da-db-design", name: "Integrity constraints, normalization, file organization and indexing", hours: 10, requires: ["da-db-model"] },
          { id: "da-db-warehouse", name: "Data types, transformation, normalization, discretization, sampling and compression", hours: 8, requires: ["da-db-model"] },
          { id: "da-db-multidimensional", name: "Data warehouse schemas, concept hierarchies, measures and computations", hours: 8, requires: ["da-db-warehouse"] },
        ],
      },
      {
        id: "da-ml", name: "Machine Learning", marks: 14.3,
        chapters: [
          { id: "da-ml-regression", name: "Regression: simple/multiple linear regression and ridge regression", hours: 12, basic: true },
          { id: "da-ml-classification", name: "Logistic regression, k-NN, naive Bayes and linear discriminant analysis", hours: 12, requires: ["da-ml-regression"] },
          { id: "da-ml-svm-trees", name: "SVM, decision trees, bias–variance and cross-validation", hours: 12, requires: ["da-ml-regression"] },
          { id: "da-ml-neural", name: "Multilayer perceptrons and feed-forward neural networks", hours: 10, requires: ["da-la-matrices"] },
          { id: "da-ml-unsupervised", name: "K-means/k-medoids, hierarchical clustering and PCA", hours: 12, requires: ["da-la-eigen"] },
        ],
      },
      {
        id: "da-ai", name: "Artificial Intelligence", marks: 8,
        chapters: [
          { id: "da-ai-search", name: "Informed, uninformed and adversarial search", hours: 8, basic: true },
          { id: "da-ai-logic", name: "Propositional and predicate logic", hours: 8, requires: ["da-ai-search"] },
          { id: "da-ai-uncertainty", name: "Conditional independence, variable elimination and inference by sampling", hours: 10, requires: ["da-prob-rv"] },
        ],
      },
    ],
  },

  CH: {
    paperName: "Chemical Engineering (CH)",
    source: "Syllabus topics follow the official GATE 2027 CH syllabus (IIT Madras: https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/CH_GATE2027_Syllabus.pdf). Subject marks and chapter hours are editable StudySync planning estimates; official chapter-wise weightage is not published and marks are not guaranteed.",
    order: ["ch-math", "ch-process", "ch-thermo", "ch-fluid", "ch-heat", "ch-mass", "ch-reaction", "ch-control", "ch-economics", "ch-technology", "ga"],
    subjects: [
      { id: "ga", name: "General Aptitude", marks: 15, parallel: true, chapters: [
        { id: "ga-verbal", name: "Verbal ability", hours: 12 },
        { id: "ga-quant", name: "Quantitative aptitude", hours: 18 },
        { id: "ga-reason", name: "Analytical and spatial reasoning", hours: 12 },
      ] },
      { id: "ch-math", name: "Engineering Mathematics", marks: 13, chapters: [
        { id: "ch-math-la", name: "Linear algebra: matrices, linear systems, eigenvalues and eigenvectors", hours: 8, basic: true },
        { id: "ch-math-calc", name: "Calculus, multivariable derivatives, extrema and integral theorems", hours: 10 },
        { id: "ch-math-de", name: "Differential equations, Laplace transforms and PDEs", hours: 10 },
        { id: "ch-math-prob", name: "Probability, statistics and common distributions", hours: 8 },
        { id: "ch-math-num", name: "Numerical methods, complex variables and fundamentals of AI/ML", hours: 8 },
      ] },
      { id: "ch-process", name: "Process Calculations", marks: 8, chapters: [
        { id: "ch-process-balances", name: "Steady and unsteady mass and energy balances", hours: 12, basic: true },
        { id: "ch-process-recycle", name: "Multiphase/reacting systems, recycle, bypass, purge and tie components", hours: 10, requires: ["ch-process-balances"] },
        { id: "ch-process-phase", name: "Gibbs phase rule and degree-of-freedom analysis", hours: 6 },
      ] },
      { id: "ch-thermo", name: "Thermodynamics", marks: 8, chapters: [
        { id: "ch-thermo-laws", name: "Laws of thermodynamics, entropy and chemical potential", hours: 10, basic: true },
        { id: "ch-thermo-properties", name: "Pure substances, equations of state and residual properties", hours: 8 },
        { id: "ch-thermo-mixtures", name: "Mixture properties, fugacity, activity coefficients and phase equilibrium", hours: 12, requires: ["ch-thermo-laws"] },
        { id: "ch-thermo-reaction", name: "Chemical reaction equilibrium", hours: 6 },
      ] },
      { id: "ch-fluid", name: "Fluid Mechanics and Mechanical Operations", marks: 11, chapters: [
        { id: "ch-fluid-basics", name: "Fluid statics, kinematics, continuity and momentum/energy equations", hours: 10, basic: true },
        { id: "ch-fluid-pipes", name: "Pipe flow, friction, dimensional analysis, pumps and boundary layers", hours: 12, requires: ["ch-fluid-basics"] },
        { id: "ch-fluid-particles", name: "Particle size, settling, centrifuges, cyclones and classification", hours: 8 },
        { id: "ch-fluid-separation", name: "Filtration, thickening, clarification, agitation and mixing", hours: 8 },
      ] },
      { id: "ch-heat", name: "Heat Transfer", marks: 7, chapters: [
        { id: "ch-heat-modes", name: "Conduction, convection, radiation and thermal boundary layers", hours: 10, basic: true },
        { id: "ch-heat-equipment", name: "Boiling, condensation, heat exchangers and evaporator calculations", hours: 12, requires: ["ch-heat-modes"] },
      ] },
      { id: "ch-mass", name: "Mass Transfer", marks: 8, chapters: [
        { id: "ch-mass-diffusion", name: "Fick's laws, diffusion and mass-transfer coefficients", hours: 10, basic: true },
        { id: "ch-mass-stages", name: "Stage-wise and continuous contacting, efficiencies, HTU and NTU", hours: 8 },
        { id: "ch-mass-operations", name: "Distillation, absorption, extraction, leaching, drying and adsorption", hours: 14, requires: ["ch-mass-diffusion"] },
        { id: "ch-mass-membranes", name: "Humidification, dehumidification and membrane separations", hours: 6 },
      ] },
      { id: "ch-reaction", name: "Chemical Reaction Engineering", marks: 8, chapters: [
        { id: "ch-reaction-kinetics", name: "Reaction-rate theories, homogeneous kinetics and kinetic-data interpretation", hours: 10, basic: true },
        { id: "ch-reaction-reactors", name: "Ideal reactors, multiple reactions and residence-time distribution", hours: 12, requires: ["ch-reaction-kinetics"] },
        { id: "ch-reaction-catalysis", name: "Non-isothermal reactions, heterogeneous catalysis, diffusion and deactivation", hours: 12, requires: ["ch-reaction-kinetics"] },
      ] },
      { id: "ch-control", name: "Instrumentation and Process Control", marks: 6, chapters: [
        { id: "ch-control-measure", name: "Process-variable measurement, sensors, transducers and P&ID symbols", hours: 8, basic: true },
        { id: "ch-control-dynamics", name: "Process models, transfer functions and dynamic response", hours: 10, requires: ["ch-control-measure"] },
        { id: "ch-control-feedback", name: "P/PI/PID control, stability, frequency response and tuning", hours: 12, requires: ["ch-control-dynamics"] },
      ] },
      { id: "ch-economics", name: "Plant Design and Economics", marks: 7, chapters: [
        { id: "ch-economics-cost", name: "Cost estimation, depreciation, cost indices and annualized cost", hours: 8, basic: true },
        { id: "ch-economics-finance", name: "Rate of return, payback, discounted cash flow and optimization", hours: 10 },
        { id: "ch-economics-design", name: "Equipment sizing and batch-plant scheduling", hours: 8 },
      ] },
      { id: "ch-technology", name: "Chemical Technology", marks: 9, chapters: [
        { id: "ch-tech-inorganic", name: "Synthesis gas, sulfuric/phosphoric acid and chlor-alkali industries", hours: 8 },
        { id: "ch-tech-fertilizer", name: "Ammonia and urea fertilizers", hours: 6 },
        { id: "ch-tech-products", name: "Pulp and paper, sugar, ethanol and natural-product industries", hours: 8 },
        { id: "ch-tech-petro", name: "Petroleum refining, petrochemicals and polymerization industries", hours: 10 },
      ] },
    ],
  },
  CE: {
    paperName: "Civil Engineering (CE)",
    source: "Syllabus topics follow the official GATE 2027 CE syllabus (IIT Madras: https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/CE_GATE2027_Syllabus.pdf). Subject marks and chapter hours are editable StudySync planning estimates; official chapter-wise weightage is not published and marks are not guaranteed.",
    order: ["ce-math", "ce-structural", "ce-geotech", "ce-water", "ce-environment", "ce-transport", "ce-geomatics", "ce-construction", "ga"],
    subjects: [
      { id: "ga", name: "General Aptitude", marks: 15, parallel: true, chapters: [
        { id: "ga-verbal", name: "Verbal ability", hours: 12 },
        { id: "ga-quant", name: "Quantitative aptitude", hours: 18 },
        { id: "ga-reason", name: "Analytical and spatial reasoning", hours: 12 },
      ] },
      { id: "ce-math", name: "Engineering Mathematics", marks: 13, chapters: [
        { id: "ce-math-la", name: "Linear algebra and systems of equations", hours: 8, basic: true },
        { id: "ce-math-calc", name: "Calculus, vector calculus and multiple integrals", hours: 10 },
        { id: "ce-math-de", name: "ODEs, PDEs, Fourier series and boundary-value problems", hours: 10 },
        { id: "ce-math-prob", name: "Probability, statistics and linear regression", hours: 8 },
        { id: "ce-math-num", name: "Numerical methods and error analysis", hours: 8 },
      ] },
      { id: "ce-structural", name: "Structural Engineering", marks: 16, chapters: [
        { id: "ce-struct-mechanics", name: "Engineering mechanics, force systems, equilibrium and friction", hours: 10, basic: true },
        { id: "ce-struct-solid", name: "Solid mechanics, stress/strain, bending, torsion and buckling", hours: 12, requires: ["ce-struct-mechanics"] },
        { id: "ce-struct-analysis", name: "Structural analysis, deflection, energy methods and influence lines", hours: 14, requires: ["ce-struct-solid"] },
        { id: "ce-struct-concrete", name: "Concrete structures: limit states, members, footings and detailing", hours: 10 },
        { id: "ce-struct-steel", name: "Steel structures, member design, connections and plastic analysis", hours: 10 },
      ] },
      { id: "ce-geotech", name: "Geotechnical Engineering", marks: 11, chapters: [
        { id: "ce-geotech-soils", name: "Soil phase relationships, classification, permeability and compaction", hours: 10, basic: true },
        { id: "ce-geotech-effective", name: "Effective stress, consolidation and shear strength", hours: 12, requires: ["ce-geotech-soils"] },
        { id: "ce-geotech-foundations", name: "Earth pressure, slope stability, bearing capacity and settlement", hours: 14, requires: ["ce-geotech-effective"] },
        { id: "ce-geotech-piles", name: "Subsurface investigation, piles and ground improvement", hours: 8 },
      ] },
      { id: "ce-water", name: "Water Resources Engineering", marks: 11, chapters: [
        { id: "ce-water-fluid", name: "Fluid mechanics, pipe flow and boundary layers", hours: 10, basic: true },
        { id: "ce-water-hydraulics", name: "Open-channel hydraulics, hydraulic jump and dimensional analysis", hours: 10, requires: ["ce-water-fluid"] },
        { id: "ce-water-hydrology", name: "Hydrologic cycle, runoff, flood routing and groundwater", hours: 10 },
        { id: "ce-water-irrigation", name: "Irrigation, dams, spillways, canals and cross-drainage structures", hours: 10 },
      ] },
      { id: "ce-environment", name: "Environmental Engineering", marks: 8, chapters: [
        { id: "ce-env-water", name: "Water quality, drinking-water treatment and distribution", hours: 10, basic: true },
        { id: "ce-env-wastewater", name: "Sewerage, wastewater treatment, sludge and reuse", hours: 10 },
        { id: "ce-env-air-waste", name: "Air pollution, air-quality standards and municipal solid waste", hours: 10 },
      ] },
      { id: "ce-transport", name: "Transportation Engineering", marks: 8, chapters: [
        { id: "ce-transport-highway", name: "Roadway geometric design, IRC parameters and sight distance", hours: 10, basic: true },
        { id: "ce-transport-pavements", name: "Highway materials and flexible/rigid pavement design", hours: 10 },
        { id: "ce-transport-traffic", name: "Traffic flow, signals, capacity, intersections and transport planning", hours: 12 },
        { id: "ce-transport-rail-air", name: "Railway track, cant and airport runway/taxiway design", hours: 6 },
      ] },
      { id: "ce-geomatics", name: "Geomatics Engineering", marks: 7, chapters: [
        { id: "ce-geo-survey", name: "Plane/geodetic surveying, levelling, traversing and total stations", hours: 10, basic: true },
        { id: "ce-geo-mapping", name: "GNSS, coordinate systems, map projections and cartography", hours: 8 },
        { id: "ce-geo-photo", name: "Photogrammetry, parallax, camera calibration and elevations", hours: 8 },
      ] },
      { id: "ce-construction", name: "Construction Materials and Management", marks: 11, chapters: [
        { id: "ce-construction-materials", name: "Cement, concrete, steel, admixtures and material properties", hours: 10, basic: true },
        { id: "ce-construction-estimation", name: "Quantity estimation, rate analysis and costing", hours: 8 },
        { id: "ce-construction-planning", name: "PERT/CPM, scheduling, construction equipment and contracts", hours: 10, requires: ["ce-construction-estimation"] },
      ] },
    ],
  },
  ME: {
    paperName: "Mechanical Engineering (ME)",
    source: "Syllabus topics follow the official GATE 2027 ME syllabus (IIT Madras: https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/ME_GATE2027_Syllabus.pdf). Subject marks and chapter hours are editable StudySync planning estimates; official chapter-wise weightage is not published and marks are not guaranteed.",
    order: ["me-math", "me-applied", "me-materials", "me-tom", "me-design", "me-fluid", "me-heat", "me-thermo", "me-manufacturing", "me-metrology", "me-cam", "me-ppc", "me-or", "ga"],
    subjects: [
      { id: "ga", name: "General Aptitude", marks: 15, parallel: true, chapters: [
        { id: "ga-verbal", name: "Verbal ability", hours: 12 },
        { id: "ga-quant", name: "Quantitative aptitude", hours: 18 },
        { id: "ga-reason", name: "Analytical and spatial reasoning", hours: 12 },
      ] },
      { id: "me-math", name: "Engineering Mathematics", marks: 13, chapters: [
        { id: "me-math-la", name: "Linear algebra and systems of equations", hours: 8, basic: true },
        { id: "me-math-calc", name: "Calculus, Fourier series and vector calculus", hours: 12 },
        { id: "me-math-de", name: "Differential equations and Laplace transforms", hours: 10 },
        { id: "me-math-prob", name: "Probability and statistics", hours: 8 },
        { id: "me-math-num", name: "Numerical methods and complex variables", hours: 8 },
      ] },
      { id: "me-applied", name: "Engineering Mechanics", marks: 6, chapters: [
        { id: "me-applied-equilibrium", name: "Free-body diagrams, equilibrium, friction, trusses and frames", hours: 10, basic: true },
        { id: "me-applied-dynamics", name: "Rigid-body kinematics, dynamics, impulse, momentum and energy", hours: 12, requires: ["me-applied-equilibrium"] },
      ] },
      { id: "me-materials", name: "Mechanics of Materials", marks: 7, chapters: [
        { id: "me-materials-stress", name: "Stress/strain, elastic constants, Mohr's circle and pressure vessels", hours: 10, basic: true },
        { id: "me-materials-beams", name: "Shear-force/bending-moment diagrams, beam deflection and torsion", hours: 12, requires: ["me-materials-stress"] },
        { id: "me-materials-columns", name: "Columns, energy methods, thermal stresses and material testing", hours: 8 },
      ] },
      { id: "me-tom", name: "Theory of Machines and Vibrations", marks: 7, chapters: [
        { id: "me-tom-mechanisms", name: "Mechanisms, cams, gears and gear trains", hours: 10, basic: true },
        { id: "me-tom-balancing", name: "Flywheels, governors and balancing of rotating/reciprocating masses", hours: 8 },
        { id: "me-tom-vibrations", name: "Free/forced vibration, damping, resonance and critical speeds", hours: 12 },
      ] },
      { id: "me-design", name: "Machine Design", marks: 7, chapters: [
        { id: "me-design-failure", name: "Static/dynamic loading, failure theories, fatigue and S-N curves", hours: 10, basic: true },
        { id: "me-design-elements", name: "Joints, shafts, gears, bearings, brakes, clutches and springs", hours: 14, requires: ["me-design-failure"] },
      ] },
      { id: "me-fluid", name: "Fluid Mechanics", marks: 7, chapters: [
        { id: "me-fluid-basics", name: "Fluid properties, statics, buoyancy and control-volume analysis", hours: 10, basic: true },
        { id: "me-fluid-flow", name: "Continuity, momentum, Bernoulli, dimensional analysis and viscous flow", hours: 12, requires: ["me-fluid-basics"] },
        { id: "me-fluid-pipes", name: "Pipe losses, boundary layers and compressible nozzle flow", hours: 8 },
      ] },
      { id: "me-heat", name: "Heat Transfer", marks: 6, chapters: [
        { id: "me-heat-conduction", name: "Conduction, fins, unsteady conduction and lumped systems", hours: 10, basic: true },
        { id: "me-heat-convection", name: "Convection, dimensionless groups and heat-transfer correlations", hours: 10 },
        { id: "me-heat-radiation", name: "Boiling, condensation, heat exchangers and radiation networks", hours: 10 },
      ] },
      { id: "me-thermo", name: "Thermodynamics and Applications", marks: 9, chapters: [
        { id: "me-thermo-laws", name: "Thermodynamic properties, first/second laws, entropy and availability", hours: 10, basic: true },
        { id: "me-thermo-cycles", name: "Vapour/gas power cycles and internal-combustion engines", hours: 10, requires: ["me-thermo-laws"] },
        { id: "me-thermo-apps", name: "Combustion, refrigeration, psychrometry and turbomachinery", hours: 12, requires: ["me-thermo-laws"] },
      ] },
      { id: "me-manufacturing", name: "Manufacturing Processes", marks: 6, chapters: [
        { id: "me-manufacturing-casting", name: "Casting, patterns, solidification, risers and defects", hours: 8, basic: true },
        { id: "me-manufacturing-forming", name: "Forming, plastic deformation, powder metallurgy and joining", hours: 10 },
        { id: "me-manufacturing-machining", name: "Machining, cutting tools, tool life and non-traditional machining", hours: 12 },
      ] },
      { id: "me-metrology", name: "Metrology and Inspection", marks: 5, chapters: [
        { id: "me-metrology-dimensions", name: "Limits, fits, tolerances and linear/angular measurements", hours: 8, basic: true },
        { id: "me-metrology-testing", name: "Comparators, interferometry, inspection and coordinate-measuring machines", hours: 8 },
      ] },
      { id: "me-cam", name: "Computer-Aided Manufacturing and Automation", marks: 4, chapters: [
        { id: "me-cam-cad", name: "CAD/CAM integration, CNC machines and programming", hours: 8, basic: true },
        { id: "me-cam-automation", name: "Pneumatic/hydraulic automation, PLCs and additive manufacturing", hours: 8 },
      ] },
      { id: "me-ppc", name: "Production Planning and Control", marks: 4, chapters: [
        { id: "me-ppc-planning", name: "Work study, forecasting, aggregate planning and scheduling", hours: 8, basic: true },
        { id: "me-ppc-inventory", name: "MRP, inventory control, lean manufacturing, Six Sigma and reliability", hours: 10 },
      ] },
      { id: "me-or", name: "Operations Research", marks: 4, chapters: [
        { id: "me-or-linear", name: "Linear programming, simplex, transportation and assignment", hours: 8, basic: true },
        { id: "me-or-networks", name: "Network flows, queuing, PERT and CPM", hours: 8 },
      ] },
    ],
  },
  RA: {
    paperName: "Robotics and Automation (RA)",
    source: "Syllabus topics follow the official GATE 2027 RA syllabus (IIT Madras: https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/RA_GATE2027_Syllabus.pdf). RA has a common Part A plus a choice of Part B1 (Electrical) or Part B2 (Mechanical). Internal subject marks and chapter hours are StudySync estimates because RA is new in 2027 and official subject-wise weightage is not published.",
    order: ["ra-math", "ra-mechatronics", "ra-robotics", "ra-b1-analog", "ra-b1-signals", "ra-b1-control", "ra-b2-materials", "ra-b2-kinematics", "ra-b2-design", "ga"],
    subjects: [
      { id: "ga", name: "General Aptitude", marks: 15, parallel: true, part: "COMMON", chapters: [
        { id: "ga-verbal", name: "Verbal ability", hours: 12 },
        { id: "ga-quant", name: "Quantitative aptitude", hours: 18 },
        { id: "ga-reason", name: "Analytical and spatial reasoning", hours: 12 },
      ] },
      { id: "ra-math", name: "Engineering Mathematics (common Part A)", marks: 13, part: "COMMON", chapters: [
        { id: "ra-math-la", name: "Linear algebra: matrices, rank, eigenvalues and systems", hours: 8, basic: true },
        { id: "ra-math-calc", name: "Calculus, multivariable derivatives and integral theorems", hours: 10 },
        { id: "ra-math-de", name: "Differential equations, Laplace transforms, heat/wave/Laplace equations and Fourier series", hours: 10 },
        { id: "ra-math-prob", name: "Probability, statistics, hypothesis testing and distributions", hours: 8 },
        { id: "ra-math-num", name: "Numerical methods and finite-difference methods", hours: 6 },
      ] },
      { id: "ra-mechatronics", name: "Basics of Mechatronics (common Part A)", marks: 25, part: "COMMON", chapters: [
        { id: "ra-mech-network", name: "Electrical networks, KCL/KVL, network theorems and AC/DC response", hours: 10, basic: true },
        { id: "ra-mech-digital", name: "Digital circuits: Boolean algebra, combinational/sequential circuits", hours: 8 },
        { id: "ra-mech-sensors", name: "Sensors, transducers and signal-conditioning circuits", hours: 8 },
        { id: "ra-mech-actuators", name: "Hydraulic/pneumatic actuators, DC/stepper/servo motors", hours: 8 },
        { id: "ra-mech-mechanics", name: "Engineering mechanics: equilibrium, friction, trusses and rigid-body motion", hours: 8 },
        { id: "ra-mech-programming", name: "Python fundamentals, flowcharts, pseudocode and data structures", hours: 10 },
      ] },
      { id: "ra-robotics", name: "Principles of Robotics and Automation (common Part A)", marks: 22, part: "COMMON", chapters: [
        { id: "ra-robotics-geometry", name: "Robot types, links/joints, configurations and degrees of freedom", hours: 8, basic: true },
        { id: "ra-robotics-kinematics", name: "Coordinate systems, rotation matrices, homogeneous transforms and forward kinematics", hours: 10, requires: ["ra-robotics-geometry"] },
        { id: "ra-robotics-control", name: "Point-to-point/continuous-path control, end-effectors, accuracy and repeatability", hours: 8, requires: ["ra-robotics-kinematics"] },
        { id: "ra-robotics-automation", name: "CIM, PLCs, material handling, storage/retrieval, CNC and positioning systems", hours: 10 },
      ] },
      { id: "ra-b1-analog", name: "Part B1 — Analog Circuits and Embedded Systems", marks: 10, part: "B1", chapters: [
        { id: "ra-b1-analog-circuits", name: "Analog filters, amplifiers, op-amps, oscillators, timers, ADC/DAC and SMPS", hours: 12, basic: true },
        { id: "ra-b1-embedded", name: "Microcontrollers, CPU/memory/I/O, interrupts and data acquisition", hours: 10 },
      ] },
      { id: "ra-b1-signals", name: "Part B1 — Signals and Systems", marks: 8, part: "B1", chapters: [
        { id: "ra-b1-signals-continuous", name: "Continuous/discrete signals, LTI systems, Fourier series and sampling", hours: 10, basic: true },
        { id: "ra-b1-signals-transforms", name: "Fourier, Laplace and Z transforms; RMS and average values", hours: 10 },
      ] },
      { id: "ra-b1-control", name: "Part B1 — Control Systems", marks: 7, part: "B1", chapters: [
        { id: "ra-b1-control-model", name: "Models, transfer functions, block diagrams and signal-flow graphs", hours: 8, basic: true },
        { id: "ra-b1-control-stability", name: "Transient/steady-state response, Routh-Hurwitz, Nyquist, Bode, root locus and PID", hours: 12 },
      ] },
      { id: "ra-b2-materials", name: "Part B2 — Mechanics of Materials", marks: 10, part: "B2", chapters: [
        { id: "ra-b2-stress", name: "Stress/strain, elastic constants, Mohr's circle, beams and torsion", hours: 12, basic: true },
        { id: "ra-b2-columns", name: "Columns, Castigliano's theorem, thermal stresses, strain gauges and testing", hours: 10 },
      ] },
      { id: "ra-b2-kinematics", name: "Part B2 — Kinematics and Dynamics", marks: 8, part: "B2", chapters: [
        { id: "ra-b2-mechanisms", name: "Mechanism displacement, velocity/acceleration and linkage dynamics", hours: 10, basic: true },
        { id: "ra-b2-vibration", name: "Gears, balancing, gyroscope, vibration, damping and critical speeds", hours: 12 },
      ] },
      { id: "ra-b2-design", name: "Part B2 — Machine Design and Computer Integrated Manufacturing", marks: 7, part: "B2", chapters: [
        { id: "ra-b2-design-elements", name: "Failure theories, fatigue and machine elements", hours: 10, basic: true },
        { id: "ra-b2-cim", name: "CAD/CAM integration and additive manufacturing", hours: 8 },
      ] },
    ],
  },
};

export function paperForBranch(branch = "") {
  const b = String(branch).trim().toLowerCase();
  // Direct GATE paper codes are accepted as well as full branch names.
  if (/^ch$|chemical engineering|chemical/.test(b)) return "CH";
  if (/^ce$|civil engineering|civil/.test(b)) return "CE";
  if (/^me$|mechanical engineering|mechanical/.test(b)) return "ME";
  if (/^ra$|robotics|automation/.test(b)) return "RA";
  // CSE with AI/ML remains the CS paper; a dedicated DS/AI program maps to DA.
  if (/^cs$|cse|computer|\bit\b|information tech/.test(b)) return "CS";
  if (/ece|electronics/.test(b)) return "EC";
  if (/eee|electrical/.test(b)) return "EE";
  if (/^(ds|da)$|data science|artificial intelligence|data science and ai/.test(b)) return "DA";
  if (/ai\s*&\s*ml|ai\s+and\s+ml/.test(b)) return "CS";
  return null;
}

// Two permitted app-level choices: graduation year minus one, or graduation year.
export function attemptYearOptions(graduationYear) {
  const year = Number(graduationYear);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) return [];
  return [year - 1, year];
}

// This is a selectable app default, not the student's confirmed paper/session date.
// GATE 2027 runs across several dates; students should edit this when their paper date is known.
export function defaultGateDate(year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2200) return "";
  if (y === 2027) return "2027-02-06";

  const date = new Date(Date.UTC(y, 1, 1));
  while (date.getUTCDay() !== 6) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
