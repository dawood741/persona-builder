'use strict';

// Standalone authoring data. No Training-HUB API or database connection.
(() => {
  const select = (id, label, options, extra = {}) => ({ id, label, type: 'select', options, ...extra });
  const field = (id, label, type = 'text', extra = {}) => ({ id, label, type, ...extra });
  const text = (id, label, extra = {}) => field(id, label, 'textarea', extra);
  const checks = (id, label, options, extra = {}) => ({ id, label, type: 'checks', options, wide: true, ...extra });
  const required = { required: true };
  const states = 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|Puerto Rico|Guam|U.S. Virgin Islands|American Samoa|Northern Mariana Islands'.split('|');
  const periods = [
    ['AEP', 'AEP — MA / Part D annual enrollment'],
    ['MA_OEP', 'MA OEP — January–March'],
    ['MA_OEP_NEW', 'MA OEP — new Medicare enrollee window'],
    ['AB_IEP', 'IEP — Parts A / B initial enrollment'],
    ['PLAN_INITIAL', 'Initial MA / Part D enrollment (ICEP / IEP)'],
    ['AB_GEP', 'GEP — Parts A / B general enrollment'],
    ['AB_SEP', 'SEP — Parts A / B'],
    ['PLAN_SEP', 'SEP — MA / Part D'],
    ['MEDIGAP_OEP', 'Medigap Open Enrollment Period'],
    ['MEDIGAP_OTHER', 'Medigap guaranteed-issue / state-specific opportunity'],
    ['NONE', 'No applicable enrollment window'],
    ['UNKNOWN', 'Opportunity needs verification'],
  ];
  const sep = d => ['AB_SEP', 'PLAN_SEP'].includes(d.period);
  const carriers = ['Humana', 'UnitedHealthcare', 'Aetna', 'HealthSpring', 'Wellcare', 'Anthem Blue Cross and Blue Shield', 'Devoted', 'Florida Blue Cross Blue Shield', 'Molina Healthcare', 'Zing', 'Kaiser Permanente', 'Aspire Health Plan', 'Dean Health Plan', 'Mutual of Omaha', 'WellPoint', 'None', 'Unknown'];
  const hasCoverageChange = d => ['JOINED', 'SWITCHED', 'LOST', '__OTHER__'].includes(d.recentCoverageChange);
  const groups = [
    { id: 'setup', title: 'Scenario setup', description: 'Choose how the customer reaches the licensed specialist, then set the situation and possible next step.', fields: [
      field('title', 'Scenario title', 'text', required),
      select('difficulty', 'Difficulty', ['Easy', 'Medium', 'Hard'], required),
      select('callContext', 'How the call started', [
        ['DIRECT_OUTBOUND', 'Agent calls the customer directly'],
        ['TRANSFERRED', 'Customer transferred to the licensed specialist'],
        ['FOLLOW_UP', 'Agent makes a scheduled follow-up / callback'],
        ['CUSTOMER_INBOUND', 'Customer calls the licensed specialist directly'],
      ], required),
      select('contactBasis', 'Permission or reason for contact', [
        'Customer requested information or a call',
        'Existing customer relationship and requested follow-up',
        'Customer agreed to a transfer during this call',
        'Permission or prior contact needs verification',
        'No permission established',
      ]),
      text('priorConversation', 'What the customer heard before this conversation', {
        wide: true,
        placeholder: 'For a transfer or follow-up, write only what was actually explained or agreed to. Leave blank for a first direct call.',
      }),
      select('target', 'Intended coverage action', [['EDUCATION', 'Education / no coverage change'], ['AB', 'Sign up for Part A and/or B'], ['JOIN_MA', 'Join or switch Medicare Advantage'], ['LEAVE_MA', 'Leave MA for Original Medicare'], ['PDP', 'Join / switch / drop standalone Part D'], ['MEDIGAP', 'Buy / change Medigap']], required),
      select('outcome', 'Expected appropriate close', [['EDUCATION', 'Education completed'], ['COMPARE', 'Continue comparison / verification'], ['ENROLL', 'Proceed with a simulated enrollment discussion'], ['REFER', 'Refer to the appropriate program'], ['CALLBACK', 'Arrange callback'], ['DECLINE', 'Customer declines'], ['DNC', 'Honor do-not-contact request']], required),
    ]},
    { id: 'background', title: 'Customer background', description: 'Employment, health circumstances, and family support can coexist.', fields: [
      field('name', 'Customer name', 'text', required),
      field('age', 'Customer age', 'number', { ...required, min: 18, max: 110 }),
      field('pronouns', 'Pronouns', 'text', { placeholder: 'For example: she/her, he/him, they/them' }),
      select('state', 'State / territory', states, required),
      field('zip', 'ZIP code', 'text', { pattern: '[0-9]{5}', placeholder: 'Five digits, if relevant' }),
      select('employment', 'Employment', ['Retired', 'Recently retired', 'Working full time', 'Working part time', 'Self-employed', 'Not currently working', 'Unknown'], required),
      field('occupation', 'Current / former occupation'),
      select('living', 'Living situation', ['Lives alone', 'With spouse / partner', 'With family', 'Assisted living', 'Institutional care', 'Other', 'Unknown']),
      select('disability', 'Disability / health circumstances', ['No disability stated', 'Disability-related Medicare eligibility', 'ALS-related eligibility', 'ESRD-related eligibility', 'Other health circumstances', 'Unknown']),
      select('caregiver', 'Caregiver involvement', ['None', 'Family helps with care', 'Paid caregiver', 'Customer cares for someone else', 'Unknown']),
      select('decisionMaker', 'Coverage decision-maker', ['Customer independently', 'Customer wants family input', 'Authorized representative', 'Authority needs verification'], required),
      field('representative', 'Family / representative context', 'text', { placeholder: 'Relationship, participation and authority to verify' }),
      text('background', 'Life story', { ...required, wide: true, placeholder: 'Where they live, what changed, and the personal stakes behind this conversation.' }),
    ]},
    { id: 'coverage-history', title: 'Insurance company & coverage history', description: 'Describe the main plan being discussed; use notes for additional policies. Time on a plan does not establish an enrollment opportunity. These details are optional.', fields: [
      select('currentCarrier', 'Current insurance company / plan brand', carriers),
      select('currentPlanType', 'Type of plan with this company', ['Medicare Advantage', 'Standalone Part D', 'Medigap / Medicare Supplement', 'Employer / union', 'Retiree', 'Medicaid', 'No private plan / Original Medicare only', 'Unknown']),
      field('currentPlanName', 'Current plan name (if known)', 'text', { placeholder: 'Exact plan name, if the customer knows it' }),
      select('currentPlanTenure', 'How long on the current plan?', ['Less than one month', 'One month', 'Two months', 'Three to six months', 'Seven to eleven months', 'One year', 'More than one year', 'Not applicable / no current plan', 'Unknown']),
      select('previousCarrier', 'Previous insurance company / plan brand', carriers),
      select('recentCoverageChange', 'Recent coverage change', [['JOINED', 'Joined a plan'], ['SWITCHED', 'Switched plans'], ['LOST', 'Lost / ended coverage'], ['NONE', 'No recent change'], ['UNKNOWN', 'Unknown']]),
      select('coverageChangeTiming', 'When did that change happen?', ['Less than one month ago', 'One month ago', 'Two months ago', 'Three to six months ago', 'Seven to eleven months ago', 'One year ago', 'More than one year ago', 'Unknown'], { when: hasCoverageChange }),
      text('coverageChangeReason', 'Why did the coverage change?', { when: hasCoverageChange, placeholder: 'For example: switched two months ago to lower costs, or previous coverage ended after retirement.' }),
      select('planSatisfaction', 'Satisfaction with current coverage', ['Satisfied', 'Mixed feelings', 'Dissatisfied', 'Too new to judge', 'Not applicable / no current coverage', 'Unknown']),
      text('planConcerns', 'Current coverage concerns / additional policies', { wide: true, placeholder: 'For example: recently switched from UnitedHealthcare to Humana; unsure whether the new plan includes their doctor. List other policies and their companies here if needed.' }),
    ]},
    { id: 'coverage', title: 'Medicare & other coverage', description: 'Record the facts the customer can disclose. Unknown is different from no coverage.', fields: [
      select('eligibilityBasis', 'Medicare eligibility basis', ['Age-related', 'Disability-related', 'ALS', 'ESRD', 'Unknown / needs clarification'], required),
      select('partA', 'Part A status', ['Active', 'Pending / future', 'Not enrolled', 'Unknown'], required),
      select('partB', 'Part B status', ['Active', 'Pending / future', 'Not enrolled', 'Unknown'], required),
      select('coverage', 'Current Medicare arrangement', [['NONE', 'Not enrolled'], ['PARTIAL', 'Part A only / Part B only'], ['ORIGINAL', 'Original Medicare'], ['MA', 'Medicare Advantage without Part D'], ['MAPD', 'Medicare Advantage with Part D'], ['UNKNOWN', 'Unknown']], required),
      select('medigap', 'Medigap status', ['None', 'Active', 'Application pending', 'Unknown'], required),
      select('drugCoverage', 'Prescription coverage', ['None', 'Standalone Part D', 'Included in MA plan', 'Employer / retiree drug coverage', 'VA / TRICARE drug coverage', 'Other / multiple sources', 'Unknown'], required),
      field('planContext', 'Plan / coverage details', 'text', { placeholder: 'Plan type, network concerns, or coverage awaiting verification' }),
      checks('otherCoverage', 'Other coverage — select all that apply', ['None', 'Unknown', 'Employer / union', 'Retiree', 'COBRA', 'Medicaid', 'VA', 'TRICARE', 'Other'], required),
      select('extraHelp', 'Extra Help / LIS status', ['No', 'Yes', 'Applied / pending', 'Unknown']),
      select('msp', 'Medicare Savings Program', ['None', 'QMB', 'SLMB', 'QI', 'QDWI', 'Unknown']),
      text('coverageNotes', 'Coordination / coverage notes', { wide: true, placeholder: 'Employment-based coverage, spouse coverage, upcoming loss, or facts the trainee must verify.' }),
    ]},
    { id: 'enrollment', title: 'Enrollment situation', description: 'Choose the period assumed for this training call. Calendar dates are not required or checked.', fields: [
      select('period', 'Enrollment pathway to assess', periods, required),
      select('eligibility', 'Enrollment situation for this scenario', [['CONFIRMED', 'Applicable to the intended action'], ['VERIFY', 'Needs verification'], ['INELIGIBLE', 'Not applicable / cannot act today']], required),
      select('sepEvent', 'SEP event / circumstance', ['Move', 'Loss of employer coverage', 'Other coverage loss', 'Medicaid / Extra Help change', 'Plan termination / service area change', 'Institutional residence / move', 'Exceptional circumstance', 'Five-star opportunity'], { ...required, when: sep }),
      text('sepDetails', 'What happened?', { ...required, when: sep, wide: true, placeholder: 'For example: moved out of the old plan service area two weeks ago. Add timing in plain words if it matters to the conversation.' }),
      select('maOepUsed', 'MA OEP change already used?', ['No', 'Yes', 'Unknown'], { ...required, when: d => ['MA_OEP', 'MA_OEP_NEW'].includes(d.period) }),
      text('enrollmentNotes', 'Extra enrollment context (optional)', { wide: true, placeholder: 'Anything specific about this customer’s situation that the agent should discover.' }),
    ]},
    { id: 'needs', title: 'Needs & customer agenda', description: 'Give the customer reasons to care and questions that follow from their life.', fields: [
      checks('topics', 'Topics covered by this scenario', ['Parts A / B', 'Medicare Advantage', 'Part D', 'Medigap', 'Enrollment periods', 'Other insurance', 'Cost assistance', 'Doctors / networks', 'Prescriptions', 'Coverage limitations', 'Appeals / complaints', 'Fraud / consent'], required),
      field('callReason', 'Why the customer wants to talk / stays on the call', 'text', { ...required, placeholder: 'A question, concern, or recent change that gives them a reason to talk.' }),
      text('customerIntent', 'Customer motivation and decision conditions', { ...required, placeholder: 'What they want to protect or change, and what must be answered before they decide. Cover every agenda question below.' }),
      checks('priorities', 'Priorities — select all that apply', ['Keep doctors', 'Prescription access', 'Predictable costs', 'Provider choice', 'Travel', 'Extra benefits', 'Avoid coverage disruption', 'Understand Medicare'], required),
      text('nonNegotiables', 'Non-negotiables', { placeholder: 'What they will not agree to give up, even in an Easy scenario.' }),
      text('providers', 'Doctors / hospitals and verification facts', { placeholder: 'Customer’s providers and preferences. Unknown network status should remain unknown.' }),
      text('prescriptions', 'Prescription / pharmacy context', { placeholder: 'Medication needs, pharmacy preferences and facts awaiting verification. No exact prices are required.' }),
      text('objections', 'Concerns and objections — one per line', { ...required, placeholder: 'Write “No major objection” if appropriate.' }),
      text('agenda', 'Natural customer questions — one per line', { ...required, placeholder: 'Can I keep my doctor?\nHow would switching affect my current coverage?' }),
      text('disclosure', 'When the customer shares these details', { ...required, placeholder: 'Describe what the customer already knows from the call or transfer, what they share when asked, and what needs more trust.' }),
    ]},
    { id: 'behavior', title: 'Personality & conversation', description: 'Define how this person speaks and responds, beyond a difficulty label.', fields: [
      select('mood', 'Mood when answering the phone', ['Calm and curious', 'Cautious', 'Frustrated', 'Anxious', 'Confused', 'Busy'], required),
      select('style', 'Speaking style', ['Short and direct', 'Methodical; one question at a time', 'Talkative; shares anecdotes', 'Reserved until comfortable', 'Needs slower explanations'], required),
      field('openingReaction', 'Initial reaction when speaking to the agent', 'text', { placeholder: 'For example: “Who is calling?” or “I was just transferred to you.”' }),
      select('knowledge', 'Medicare understanding', ['New to Medicare', 'Knows basics', 'Experienced plan shopper', 'Confident but has misconceptions', 'Unknown'], required),
      select('readiness', 'Decision readiness', ['Exploring', 'Comparing', 'Ready if needs are met', 'Needs family input', 'Not ready to change', 'Does not want contact'], required),
      field('language', 'Language / communication needs', 'text', { placeholder: 'English; prefers short explanations; interpreter scenario…' }),
      field('personality', 'Editable personality traits', 'text', { ...required, placeholder: 'Patient, skeptical of guarantees, dry humor…' }),
      select('voicePresentation', 'Voice presentation for automatic matching', [['female', 'Feminine voice'], ['male', 'Masculine voice'], ['any', 'No voice-gender preference']]),
      text('voiceDescription', 'Their voice — how they speak', { wide: true, placeholder: 'Soft and warm, hums before answering. Trails off when unsure; gets clipped and firm if pressured.' }),
      text('buildsTrust', 'What builds trust?', { ...required, placeholder: 'For example: plain explanations and admitting when a fact needs checking.' }),
      text('losesTrust', 'What loses trust?', { ...required, placeholder: 'For example: pressure, interruptions, or unsupported promises.' }),
      text('reactions', 'How behavior changes during the call', { placeholder: 'How they respond to clear answers, repetition, uncertainty, and a rushed close.' }),
      text('misconceptions', 'Beliefs / misconceptions', { placeholder: 'What the customer believes, including any mistaken beliefs the agent should address.' }),
    ]},
  ];
  const OTHER = '__OTHER__';
  // Give each choice field a dedicated, conditional custom answer.
  for (const group of groups) {
    group.fields = group.fields.flatMap(f => {
      if (!f.options) return [f];
      f.options = f.options.filter(o => o !== 'Other');
      f.options.push([OTHER, 'Other — enter your own']);
      return [f, field(f.id + 'Other', 'Your choice for ' + f.label.toLowerCase(), 'text', {
        required: true,
        customFor: f.id,
        placeholder: 'Enter your own choice…',
        when: d => (!f.when || f.when(d)) && (Array.isArray(d[f.id]) ? d[f.id].includes(OTHER) : d[f.id] === OTHER),
      })];
    });
  }
  const fields = groups.flatMap(g => g.fields);
  const optionPairs = f => (f.options || []).map(o => Array.isArray(o) ? o : [o, o]);
  const active = (f, d) => !f.when || f.when(d);
  const lines = value => String(value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const isMA = d => ['MA', 'MAPD'].includes(d.coverage);
  const custom = (d, key) => Array.isArray(d[key]) ? d[key].includes(OTHER) : d[key] === OTHER;

  // Authoring help is UI metadata only; it is never included in persona exports.
  const helpText = {
    title: ['Give this scenario a short, recognizable name.', 'Recently switched plans and wants to keep her doctor'],
    difficulty: ['Choose how challenging the conversation should be for the trainee.', 'Medium: cautious, asks follow-up questions, needs clear explanations'],
    callContext: ['Choose how this conversation with the licensed specialist begins.', 'Customer transferred to the licensed specialist'],
    contactBasis: ['Record the customer’s permission or the reason for contact. If it has not been established, choose that explicitly.', 'Customer requested information or a call'],
    priorConversation: ['Write only facts actually explained to the customer before this conversation. The customer will not assume anything else was said.', 'Before transfer, the customer was told a licensed specialist would review Medicare plan options; no benefits were discussed.'],
    target: ['Choose the coverage action the conversation explores, not a guaranteed result.', 'Join or switch Medicare Advantage'],
    outcome: ['Choose an appropriate possible close. The customer can still decline or need more information.', 'Continue comparison / verification'],
    name: ['Enter the name the customer uses during the call.', 'Evelyn Carter'],
    age: ['Enter the customer’s age as a whole number from 18 to 110.', '68'],
    pronouns: ['Enter how the customer should be referred to.', 'She/her'],
    state: ['Choose where the customer lives for this scenario.', 'Florida'],
    zip: ['Enter a five-digit ZIP code if location detail matters.', '33101'],
    occupation: ['Enter the customer’s current or former job.', 'Retired school secretary'],
    representative: ['Describe who helps the customer and what authority, if any, still needs checking.', 'Daughter helps compare options; customer makes the final decision'],
    background: ['Describe the customer’s life, recent changes, and why this conversation matters.', 'Retired recently, lives with her husband, and wants to avoid changing doctors'],
    currentCarrier: ['Choose the company for the main plan being discussed, not the plan type. Use notes for additional policies.', 'Humana'],
    currentPlanType: ['Choose what kind of policy the selected company provides for this customer. Match the coverage section.', 'Medigap / Medicare Supplement'],
    currentPlanName: ['Enter the exact plan name if known. Otherwise leave this optional field blank.', 'Customer only knows the company name; leave blank until the plan name is known'],
    currentPlanTenure: ['Choose how long the current plan has been active. This is history, not a decision about switching eligibility.', 'Two months'],
    previousCarrier: ['Choose the insurer before the current plan. None and Unknown mean different things.', 'UnitedHealthcare'],
    recentCoverageChange: ['Distinguish joining a plan, switching plans, and losing coverage.', 'Switched plans'],
    coverageChangeTiming: ['Record how long ago the selected change happened. Use Other for a more specific duration.', 'Two months ago'],
    coverageChangeReason: ['Explain why the customer joined, switched, or lost coverage.', 'Switched two months ago hoping to reduce costs'],
    planSatisfaction: ['Choose how the customer feels about their current coverage.', 'Mixed feelings'],
    planConcerns: ['Describe specific concerns and any additional policies with other companies.', 'Likes the premium but is unsure whether her doctor is in network'],
    eligibilityBasis: ['Record the stated basis for Medicare eligibility; use the unknown option if it needs clarification.', 'Age-related'],
    partA: ['Choose the customer’s Part A status at the time of the conversation.', 'Active'],
    partB: ['Choose the customer’s Part B status separately from Part A.', 'Pending / future'],
    coverage: ['Choose the current Medicare arrangement, not the coverage the customer hopes to get.', 'Original Medicare'],
    medigap: ['Record whether the customer currently has a Medicare Supplement policy.', 'None'],
    drugCoverage: ['Choose where the customer currently gets prescription coverage.', 'Standalone Part D'],
    planContext: ['Add plan details or unresolved coverage questions not captured by the choices.', 'Customer knows the insurer but needs help identifying the exact plan'],
    otherCoverage: ['Select all additional coverage sources that apply. Select None or Unknown alone.', 'VA and Retiree'],
    extraHelp: ['Record the customer’s stated Extra Help / LIS status. Do not infer it from income alone.', 'Applied / pending'],
    msp: ['Record the Medicare Savings Program stated in the scenario, or choose Unknown.', 'Unknown'],
    coverageNotes: ['Explain how other coverage, employment, or upcoming changes affect the customer’s situation.', 'Spouse’s employer coverage may end soon; the end date still needs checking'],
    period: ['Choose the enrollment pathway the trainee should assess. This builder does not check calendar eligibility.', 'Opportunity needs verification'],
    eligibility: ['Choose whether the scenario establishes an applicable pathway or leaves facts to verify.', 'Needs verification'],
    sepEvent: ['Choose the circumstance the trainee should investigate for a Special Enrollment Period.', 'Move'],
    sepDetails: ['Describe the event, relative timing, and missing facts without assuming eligibility.', 'Moved two weeks ago; whether the new address is outside the service area needs checking'],
    maOepUsed: ['Record whether the customer has already used the MA OEP change being discussed.', 'Unknown'],
    enrollmentNotes: ['Add enrollment facts or uncertainties the trainee should discover.', 'Customer remembers changing plans recently but cannot recall which enrollment period was used'],
    topics: ['Select every topic this conversation should cover.', 'Enrollment periods and Doctors / networks'],
    callReason: ['Explain why this customer stays on the call or wants to talk.', 'Wants to know whether she can keep her specialist'],
    customerIntent: ['Describe the customer’s goals and what must be answered before they decide. Include every agenda concern.', 'Will compare options only after checking her doctor and prescription coverage'],
    priorities: ['Select the things the customer values most when discussing coverage.', 'Keep doctors and Avoid coverage disruption'],
    nonNegotiables: ['Describe what the customer will not agree to give up.', 'Will not switch without verifying her cardiologist'],
    providers: ['List important doctors or hospitals and distinguish known facts from unverified network status.', 'Dr. Lee is her cardiologist; network participation is unknown'],
    prescriptions: ['Describe medication and pharmacy needs. Leave unverified coverage or prices unknown.', 'Uses a local pharmacy and wants her regular prescriptions checked'],
    objections: ['Write one customer concern per line, or say No major objection.', 'I just switched plans.\nI do not want another gap in coverage.'],
    agenda: ['Write the questions the customer naturally wants answered, one per line.', 'Can I keep my doctor?\nWhat happens to my current coverage if I switch?'],
    disclosure: ['Describe when the customer reveals details and what requires more trust.', 'Shares her insurer when asked; explains her recent switch after the agent listens to her concern'],
    mood: ['Choose the customer’s emotional state when the conversation begins.', 'Cautious'],
    style: ['Choose how the customer usually speaks, separately from their mood.', 'Methodical; one question at a time'],
    openingReaction: ['Write a natural first reaction that fits a direct call, transfer, or follow-up.', 'I was just transferred to you. Can you help me check my doctor?'],
    knowledge: ['Choose how well the customer understands Medicare, including mistaken confidence.', 'Knows basics'],
    readiness: ['Choose how willing the customer is to make a decision now.', 'Needs family input'],
    language: ['Describe the preferred language, pace, or communication support.', 'English; prefers slow explanations without jargon'],
    personality: ['Describe a few consistent traits rather than only a difficulty level.', 'Practical, skeptical of promises, patient when explanations are clear'],
    voicePresentation: ['Choose the vocal presentation used to match an available voice. This is not inferred from the customer name or pronouns.', 'Feminine voice'],
    voiceDescription: ['Describe how this customer sounds: pace, warmth, verbal habits, and how delivery changes when reassured or upset. Keep life circumstances in the background field.', 'Soft and warm, hums before answering. Trails off when unsure; becomes clipped and firm if pressured.'],
    buildsTrust: ['Describe agent behavior that helps the customer feel comfortable.', 'Explains one point at a time and admits when details need checking'],
    losesTrust: ['Describe agent behavior that makes this customer hesitant or upset.', 'Interruptions, pressure to decide, and promises without verification'],
    reactions: ['Explain how the customer’s behavior changes in response to the agent.', 'Opens up after clear answers; becomes brief and guarded if rushed'],
    misconceptions: ['Record mistaken customer beliefs as beliefs, not as true coverage rules.', 'Customer incorrectly believes every plan from the same company has the same doctor network'],
  };
  for (const f of fields) {
    const parent = f.customFor && fields.find(candidate => candidate.id === f.customFor);
    const [instruction, example] = helpText[f.id] || (parent
      ? ['Enter your own answer for “' + parent.label + '”. Be specific; this replaces the preset choice.', helpText[parent.id]?.[1] || 'Describe the customer’s specific situation in your own words']
      : ['Choose the option that best describes the customer’s ' + f.label.toLowerCase() + '. Use Other if the listed choices do not fit.', optionPairs(f)[0]?.[1]]);
    f.help = { instruction, example };
  }

  function clean(raw) {
    const data = {};
    for (const f of fields) {
      // Older drafts used a bare Other choice without its own input.
      let v = raw[f.id];
      if (f.options && v === 'Other') v = OTHER;
      if (f.options && Array.isArray(v)) v = v.map(x => x === 'Other' ? OTHER : x);
      data[f.id] = f.type === 'checks' ? (Array.isArray(v) ? v.filter(x => typeof x === 'string') : [])
        : (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
    }
    for (const f of fields) if (!active(f, data)) data[f.id] = f.type === 'checks' ? [] : '';
    return data;
  }

  function validate(raw) {
    const d = clean(raw);
    const findings = [];
    const add = (severity, fieldId, message) => findings.push({ severity, field: fieldId, message });
    const error = (id, message) => add('error', id, message);
    const warn = (id, message) => add('warning', id, message);
    for (const f of fields) {
      if (!active(f, d)) continue;
      const v = d[f.id];
      if (f.required && !v.length) error(f.id, f.label + ' is required.');
      if (f.options && v.length) {
        const allowed = optionPairs(f).map(o => o[0]);
        if ((Array.isArray(v) ? v : [v]).some(x => !allowed.includes(x))) error(f.id, 'Choose a valid option for ' + f.label + '.');
      }
    }
    if (d.age && (!Number.isInteger(Number(d.age)) || Number(d.age) < 18 || Number(d.age) > 110)) error('age', 'Age must be a whole number between 18 and 110.');
    if (d.voiceDescription.length > 2000) error('voiceDescription', 'Voice description must be 2,000 characters or less.');
    if (d.zip && !/^\d{5}$/.test(d.zip)) error('zip', 'ZIP code must contain five digits.');
    if (d.otherCoverage.length > 1 && d.otherCoverage.some(x => ['None', 'Unknown'].includes(x))) error('otherCoverage', 'Choose None or Unknown alone, or select the actual coverage sources.');
    if (isMA(d) && ((!custom(d, 'partA') && d.partA !== 'Active') || (!custom(d, 'partB') && d.partB !== 'Active'))) error('coverage', 'Current MA coverage conflicts with Part A/B status. Record both as active, or choose the correct current arrangement.');
    if (d.coverage === 'NONE' && [d.partA, d.partB].includes('Active')) error('coverage', 'Not enrolled conflicts with an active Medicare Part.');
    if (d.coverage === 'PARTIAL' && d.partA === 'Active' && d.partB === 'Active') error('coverage', 'Part A only / Part B only conflicts with both Parts being active.');
    if (d.coverage === 'ORIGINAL' && ((!custom(d, 'partA') && d.partA !== 'Active') || (!custom(d, 'partB') && d.partB !== 'Active'))) warn('coverage', 'Check whether this should be Part A only / Part B only, or explain the unknown Part status.');
    if (d.coverage === 'MAPD' && !custom(d, 'drugCoverage') && !['Included in MA plan', 'Other / multiple sources'].includes(d.drugCoverage)) error('drugCoverage', 'MA-PD includes drug coverage; reconcile the prescription coverage selection.');
    if (!isMA(d) && !custom(d, 'coverage') && d.drugCoverage === 'Included in MA plan') error('drugCoverage', 'Drug coverage is marked as included in MA, but current coverage is not MA.');
    if (d.coverage === 'MA' && d.drugCoverage === 'Included in MA plan') error('coverage', 'Choose MA-PD if the MA plan includes Part D.');
    if (isMA(d) && d.medigap === 'Active') warn('medigap', 'Explain the concurrent Medigap policy: it does not supplement MA benefits. Do not assume it can be used with this MA plan.');
    if (d.coverage === 'MA' && d.drugCoverage === 'Standalone Part D') warn('drugCoverage', 'Verify the MA plan type permits separate Part D; do not treat this as generally allowed.');
    if (['MA_OEP', 'MA_OEP_NEW'].includes(d.period)) {
      if (!isMA(d) && !custom(d, 'coverage')) error('period', 'MA OEP requires current Medicare Advantage enrollment.');
      if (d.maOepUsed === 'Yes' && d.eligibility === 'CONFIRMED') error('maOepUsed', 'A used MA OEP change conflicts with claiming another change under this pathway.');
      if (d.maOepUsed === 'Unknown' && d.eligibility === 'CONFIRMED') error('maOepUsed', 'Verify whether the MA OEP change was used before marking this pathway applicable.');
    }
    if (['AB_IEP', 'AB_GEP', 'AB_SEP'].includes(d.period) && !custom(d, 'target') && !['AB', 'EDUCATION', ''].includes(d.target)) error('target', 'A Part A/B enrollment pathway is not itself an MA, Part D or Medigap election. Choose the pathway for the intended action.');
    if (['AEP', 'MA_OEP', 'MA_OEP_NEW', 'PLAN_INITIAL', 'PLAN_SEP'].includes(d.period) && ['AB', 'MEDIGAP'].includes(d.target)) error('target', 'This is an MA/Part D pathway. Part A/B signup and Medigap need their own enrollment analysis.');
    if (['MEDIGAP_OEP', 'MEDIGAP_OTHER'].includes(d.period) && !custom(d, 'target') && !['MEDIGAP', 'EDUCATION', ''].includes(d.target)) error('target', 'A Medigap opportunity does not establish an MA/Part D election.');
    if (d.period === 'MEDIGAP_OEP') {
      if (d.age && Number(d.age) < 65) warn('period', 'For an under-65 scenario, verify state-specific rights and consider the state-specific Medigap pathway.');
      if (d.partB !== 'Active' && !custom(d, 'partB')) warn('partB', 'Verify Part B start and age-based timing before treating Medigap open enrollment as available.');
    }
    if (['NONE', 'UNKNOWN'].includes(d.period) && d.eligibility === 'CONFIRMED') error('eligibility', 'No/unknown window cannot be marked applicable to the intended action.');
    if (d.outcome === 'ENROLL' && ((!custom(d, 'eligibility') && d.eligibility !== 'CONFIRMED') || ['NONE', 'UNKNOWN'].includes(d.period) || d.target === 'EDUCATION')) error('outcome', 'An enrollment close needs an applicable pathway and a coverage action.');
    if (d.target === 'LEAVE_MA' && !isMA(d) && !custom(d, 'coverage')) error('target', 'Leaving MA requires current MA coverage.');
    if (d.outcome === 'ENROLL' && ['Not ready to change', 'Does not want contact'].includes(d.readiness)) error('outcome', 'Enrollment close conflicts with customer readiness. Choose a respectful alternative outcome.');
    if (d.readiness === 'Does not want contact' && d.outcome !== 'DNC') warn('outcome', 'The authored customer does not want contact. Ensure the close honors that request.');
    const customFields = fields.filter(f => f.options && custom(d, f.id));
    if (customFields.length) warn(customFields[0].id, 'Custom choices are preserved as written. Review their consistency yourself: ' + customFields.map(f => f.label).join(', ') + '.');
    return findings;
  }

  function build(raw) {
    const d = clean(raw);
    const resolveChoice = (id, value) => value === OTHER ? { value: 'OTHER', text: d[id + 'Other'] } : value;
    const pick = ids => Object.fromEntries(ids.map(id => [id, Array.isArray(d[id])
      ? d[id].map(v => resolveChoice(id, v)) : resolveChoice(id, d[id] || null)]));
    return {
      schemaVersion: '4.2',
      campaign: 'MEDICARE',
      scenario: {
        ...pick(['title', 'difficulty', 'callContext', 'contactBasis', 'priorConversation', 'target', 'outcome', 'topics']),
        traineeRole: 'LICENSED_SPECIALIST',
        callDirection: ({ DIRECT_OUTBOUND: 'OUTBOUND', FOLLOW_UP: 'OUTBOUND', TRANSFERRED: 'TRANSFER', CUSTOMER_INBOUND: 'INBOUND' })[d.callContext] || null,
        initiatedBy: ({ DIRECT_OUTBOUND: 'AGENT', FOLLOW_UP: 'AGENT', CUSTOMER_INBOUND: 'CUSTOMER' })[d.callContext] || null,
        enrollment: { ...pick(['period', 'eligibility', 'enrollmentNotes', 'maOepUsed']) },
      },
      customer: {
        role: 'CUSTOMER',
        identity: { ...pick(['name', 'pronouns', 'state', 'zip']), age: d.age ? Number(d.age) : null },
        background: pick(['employment', 'occupation', 'living', 'disability', 'caregiver', 'decisionMaker', 'representative', 'background']),
        behavior: pick(['mood', 'style', 'openingReaction', 'knowledge', 'readiness', 'language', 'personality', 'voicePresentation', 'voiceDescription', 'buildsTrust', 'losesTrust', 'reactions', 'misconceptions', 'disclosure']),
        coverage: pick(['eligibilityBasis', 'partA', 'partB', 'coverage', 'medigap', 'drugCoverage', 'planContext', 'otherCoverage', 'extraHelp', 'msp', 'coverageNotes']),
        coverageHistory: pick(['currentCarrier', 'currentPlanType', 'currentPlanName', 'currentPlanTenure', 'previousCarrier', 'recentCoverageChange', 'coverageChangeTiming', 'coverageChangeReason', 'planSatisfaction', 'planConcerns']),
        recentEvent: sep(d) ? pick(['sepEvent', 'sepDetails']) : null,
        needs: { ...pick(['callReason', 'customerIntent', 'priorities', 'nonNegotiables', 'providers', 'prescriptions']), objections: lines(d.objections), questions: lines(d.agenda) },
      },
      authoringChecks: { scope: 'Preset choice consistency only. Enrollment period is assumed for training; calendar timing and custom choices are not verified.', findings: validate(d) },
    };
  }

  // Display-only formatting. Stored values, validation and export keep the original wording.
  const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'if', 'in', 'into', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'via', 'with']);
  const capitalise = (word, first) => {
    if (!word || /[A-Z]/.test(word.slice(1)) || /^[^a-z]/.test(word)) return word;
    if (!first && SMALL_WORDS.has(word)) return word;
    return word[0].toUpperCase() + word.slice(1);
  };
  const titleCase = str => str.split(' ').map((word, i) =>
    word.split(/([/-])/).map((part, j) => capitalise(part, i === 0 && j === 0 || j > 0 && part.length > 3)).join('')).join(' ');
  const splitLabel = str => {
    const m = str.match(/^(.*?)\s+(?:—\s+(.+)|\((.+)\))$/);
    if (!m) return { main: titleCase(str), note: '' };
    const note = (m[2] || m[3]).trim();
    return { main: titleCase(m[1]), note: note[0].toUpperCase() + note.slice(1) };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = { groups, fields, clean, validate, build };
  // Shared with the saved-personas page, which shows the same sections and labels.
  if (typeof window !== 'undefined') window.PersonaSchema = { groups, fields, optionPairs, active, clean, OTHER, titleCase, splitLabel };
  if (typeof document === 'undefined' || !document.getElementById('personaForm')) return;
  const form = document.getElementById('personaForm');
  // Status line and draft buttons are optional; the page may be served without them.
  const status = document.getElementById('status') || { textContent: '' };
  const findings = document.getElementById('findings');
  const preview = document.getElementById('preview');
  const output = document.getElementById('output');
  const storageKey = 'medicare-persona-builder:v2:draft';
  const node = (tag, textContent, className) => {
    const element = document.createElement(tag);
    if (textContent !== undefined) element.textContent = textContent;
    if (className) element.className = className;
    return element;
  };
  const ICON_INFO = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">'
    + '<circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" stroke-width="1.5"/>'
    + '<path d="M10 9v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
    + '<circle cx="10" cy="6.25" r="1" fill="currentColor"/></svg>';

  let openHelp = null;
  function closeHelp() {
    if (!openHelp) return;
    openHelp.tip.hidden = true;
    openHelp.button.setAttribute('aria-expanded', 'false');
    openHelp = null;
  }
  function addHelp(f, heading) {
    const holder = node('span', undefined, 'field-help');
    const button = node('button', undefined, 'help-button');
    button.innerHTML = ICON_INFO;
    button.type = 'button';
    button.id = 'help-button-' + f.id;
    button.setAttribute('aria-label', 'Help for ' + splitLabel(f.label).main);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'help-' + f.id);
    button.setAttribute('aria-describedby', 'help-' + f.id);
    const tip = node('span', undefined, 'help-tooltip');
    tip.id = 'help-' + f.id;
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    tip.append(node('span', f.help.instruction), node('strong', 'Example', 'help-example-label'), node('span', f.help.example));
    const show = () => {
      if (openHelp?.button === button) return;
      closeHelp();
      tip.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      openHelp = { button, tip, holder, pinned: false };
    };
    holder.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') show(); });
    holder.addEventListener('pointerleave', () => {
      if (openHelp?.button === button && !openHelp.pinned && document.activeElement !== button) closeHelp();
    });
    button.addEventListener('focus', show);
    button.addEventListener('click', () => {
      if (openHelp?.button === button && openHelp.pinned) closeHelp();
      else { show(); openHelp.pinned = true; }
    });
    button.addEventListener('blur', () => { if (openHelp?.button === button) closeHelp(); });
    holder.append(button, tip);
    heading.append(holder);
  }
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeHelp(); });
  document.addEventListener('pointerdown', event => { if (openHelp && !openHelp.holder.contains(event.target)) closeHelp(); });
  for (const [index, group] of groups.entries()) {
    const section = node('section', undefined, 'card');
    section.id = group.id;
    const heading = node('div', undefined, 'section-head');
    heading.append(node('span', String(index + 1).padStart(2, '0'), 'number'), node('h2', titleCase(group.title)));
    section.append(heading, node('p', group.description));
    const grid = node('div', undefined, 'grid');
    for (const f of group.fields) {
      const wrap = node(f.type === 'checks' ? 'fieldset' : 'div', undefined, 'field' + (f.wide ? ' wide' : ''));
      wrap.id = 'wrap-' + f.id;
      const heading = node(f.type === 'checks' ? 'legend' : 'div', undefined, 'field-heading');
      const { main, note } = splitLabel(f.label);
      const label = node(f.type === 'checks' ? 'span' : 'label', main);
      if (f.required) { const req = node('span', '*', 'req'); req.setAttribute('aria-hidden', 'true'); label.append(req); label.setAttribute('aria-label', main + ' (required)'); }
      if (note) label.append(node('span', note, 'label-note'));
      if (f.type !== 'checks') label.htmlFor = f.id;
      heading.append(label);
      addHelp(f, heading);
      wrap.append(heading);
      if (f.type === 'checks') {
        const list = node('div', undefined, 'checks');
        for (const [value, caption] of optionPairs(f)) {
          const item = node('label');
          const input = node('input');
          input.type = 'checkbox'; input.name = f.id; input.value = value;
          input.setAttribute('aria-describedby', 'help-' + f.id);
          item.append(input, node('span', caption)); list.append(item);
        }
        wrap.append(list);
      } else {
        const input = node(f.type === 'select' ? 'select' : f.type === 'textarea' ? 'textarea' : 'input');
        input.id = f.id; input.name = f.id; input.required = Boolean(f.required);
        input.setAttribute('aria-describedby', 'help-' + f.id);
        if (input.tagName === 'INPUT') input.type = f.type;
        for (const attr of ['placeholder', 'min', 'max', 'pattern']) if (f[attr] !== undefined) input.setAttribute(attr, String(f[attr]));
        if (f.type === 'select') {
          input.append(new Option('Select…', ''));
          for (const [value, caption] of optionPairs(f)) input.append(new Option(caption, value));
        }
        wrap.append(input);
      }
      grid.append(wrap);
    }
    section.append(grid);
    document.getElementById('fields').append(section);
    const link = node('a');
    link.append(node('span', String(index + 1).padStart(2, '0'), 'nav-num'), node('span', titleCase(group.title), 'nav-title'));
    link.href = '#' + group.id; document.getElementById('sections').append(link);
  }

  const sectionLinks = [...document.querySelectorAll('#sections a')];
  const trackedSections = sectionLinks.map(link => document.getElementById(link.hash.slice(1)));
  function highlightSection(id) {
    for (const link of sectionLinks) {
      if (link.hash === '#' + id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  function updateSectionHighlight() {
    // Follow the section near the top of the viewport, including long sections.
    const readingLine = Math.min(140, window.innerHeight * 0.2);
    let current = trackedSections[0];
    for (const section of trackedSections) {
      if (section.getBoundingClientRect().top <= readingLine) current = section;
      else break;
    }
    // A short final section may never reach the reading line.
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      current = trackedSections[trackedSections.length - 1];
    }
    highlightSection(current.id);
  }
  let highlightFrame = null;
  function scheduleHighlight() {
    if (highlightFrame !== null) return;
    highlightFrame = requestAnimationFrame(() => {
      highlightFrame = null;
      updateSectionHighlight();
    });
  }
  for (const link of sectionLinks) {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      highlightSection(link.hash.slice(1));
      // Keep native anchor navigation, keyboard behavior and browser history.
      scheduleHighlight();
    });
  }
  window.addEventListener('scroll', scheduleHighlight, { passive: true });
  window.addEventListener('resize', scheduleHighlight);
  window.addEventListener('hashchange', scheduleHighlight);
  window.addEventListener('pageshow', scheduleHighlight);
  // Conditional inputs, textarea resizing and JSON previews change section positions.
  new ResizeObserver(scheduleHighlight).observe(form);
  updateSectionHighlight();

  function read() {
    const fd = new FormData(form);
    return clean(Object.fromEntries(fields.map(f => [f.id, f.type === 'checks' ? fd.getAll(f.id) : fd.get(f.id) || ''])));
  }
  function sync() {
    const d = read();
    for (const f of fields) {
      const enabled = active(f, d);
      const wrap = document.getElementById('wrap-' + f.id);
      wrap.hidden = !enabled;
      if (!enabled && openHelp && wrap.contains(openHelp.button)) closeHelp();
      for (const input of wrap.querySelectorAll('input,select,textarea')) {
        input.disabled = !enabled;
        if (!enabled) input.value = '';
      }
    }
  }
  function invalidate() {
    // The review panel is optional; the page may be served without it.
    if (output) output.textContent = '';
    if (preview) { preview.hidden = true; preview.open = false; }
    if (findings) findings.replaceChildren();
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }
  function applyValues(values) {
    const d = clean(values);
    for (const f of fields) {
      const wrap = document.getElementById('wrap-' + f.id);
      for (const input of wrap.querySelectorAll('input,select,textarea')) {
        input.disabled = false;
        if (f.type === 'checks') input.checked = d[f.id].includes(input.value);
        else input.value = d[f.id];
      }
    }
    sync(); invalidate();
  }
  form.addEventListener('input', () => { invalidate(); status.textContent = 'Unsaved changes. Save draft to keep your work in this browser.'; });
  form.addEventListener('change', () => { sync(); invalidate(); });
  form.addEventListener('reset', () => {
    // Native values reset after the event is dispatched.
    setTimeout(() => { sync(); invalidate(); status.textContent = 'Form cleared. A previously saved draft can still be restored.'; }, 0);
  });
  document.getElementById('save')?.addEventListener('click', () => {
    try {
      const savedAt = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify({ version: 2, savedAt, values: read() }));
      status.textContent = 'Draft saved in this browser at ' + new Date(savedAt).toLocaleTimeString() + '.';
    } catch { status.textContent = 'This browser cannot save drafts locally.'; }
  });
  document.getElementById('restore')?.addEventListener('click', () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) { status.textContent = 'No saved draft in this browser.'; return; }
      const draft = JSON.parse(stored);
      if (draft.version !== 2 || !draft.values || typeof draft.values !== 'object' || Array.isArray(draft.values)) throw new Error('Unsupported draft');
      applyValues(draft.values);
      status.textContent = 'Saved draft restored.';
    } catch { status.textContent = 'The saved draft could not be restored. Your current form has not been cleared.'; }
  });
  function review() {
    sync();
    const d = read();
    const issues = validate(d);
    findings.replaceChildren();
    for (const issue of issues) {
      findings.append(node('div', (issue.severity === 'error' ? 'Fix: ' : 'Review: ') + issue.message, 'issue ' + issue.severity));
      const input = document.getElementById(issue.field);
      if (input && issue.severity === 'error') input.setAttribute('aria-invalid', 'true');
    }
    if (issues.some(i => i.severity === 'error')) {
      output.textContent = ''; preview.hidden = true;
      status.textContent = 'Fix the highlighted issues before exporting. You can save an unfinished draft.';
      findings.focus(); return null;
    }
    if (!issues.length) findings.append(node('div', 'Preset choices are consistent. Review the customer story and answers before using this persona.', 'issue success'));
    const result = build(d);
    output.textContent = JSON.stringify(result, null, 2);
    preview.hidden = false; preview.open = true;
    status.textContent = issues.length ? 'JSON is ready with review notes included.' : 'JSON is ready.';
    return result;
  }
  form.addEventListener('submit', event => { event.preventDefault(); if (findings) review(); });
  document.getElementById('download')?.addEventListener('click', () => {
    const result = review();
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
    const anchor = node('a');
    anchor.href = url;
    anchor.download = (result.customer.identity.name || 'medicare-persona').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80) + '.json';
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Persona JSON download requested.';
  });

  // ── Saved personas (Vercel Function + Neon Postgres) ──────────────
  const ui = {
    list: document.getElementById('savedList'),
    empty: document.getElementById('savedEmpty'),
    title: document.getElementById('currentTitle'),
    state: document.getElementById('saveState'),
    save: document.getElementById('savePersona'),  };
  let currentId = null;
  let dirty = false;
  let busy = false;

  function setState(message, tone = '') {
    ui.state.textContent = message;
    ui.state.dataset.tone = tone;
  }
  /** Brief confirmation that pops up at the bottom of the screen and fades away. */
  let toastTimer;
  function toast(message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = node('div', undefined, 'toast');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      document.body.append(el);
    }
    el.replaceChildren();
    el.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor"/><path d="m6 10.3 2.6 2.6L14 7.5" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    el.append(node('span', message));
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  function showTitle() {
    ui.title.textContent = form.elements.title?.value.trim() || 'New Persona';
  }
  const timeLabel = iso => {
    const d = new Date(iso);
    const sameDay = d.toDateString() === new Date().toDateString();
    return sameDay ? 'Today, ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  async function api(method, query = '', body) {
    let res;
    try {
      res = await fetch('/api/personas' + query, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'The server returned an error (' + res.status + ').');
    return data;
  }

  function renderList(rows) {
    ui.list.replaceChildren();
    ui.empty.hidden = rows.length > 0;
    if (!rows.length) ui.empty.textContent = 'No saved personas yet.';
    for (const row of rows) {
      const item = node('li', undefined, 'saved-item' + (row.id === currentId ? ' current' : ''));
      const open = node('button', undefined, 'saved-open');
      open.type = 'button';
      open.append(node('span', row.title, 'saved-title'),
        node('span', [row.customer_name, row.difficulty, timeLabel(row.updated_at)].filter(Boolean).join(' · '), 'saved-meta'));
      open.addEventListener('click', () => openPersona(row.id));
      const remove = node('button', undefined, 'saved-delete');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Delete ' + row.title);
      remove.innerHTML = '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
      remove.addEventListener('click', () => deletePersona(row.id, row.title));
      item.append(open, remove);
      ui.list.append(item);
    }
  }

  async function loadList() {
    try {
      const { personas } = await api('GET');
      renderList(personas);
    } catch (error) {
      ui.list.replaceChildren();
      ui.empty.hidden = false;
      ui.empty.textContent = error.message;
    }
  }

  const confirmDiscard = () => !dirty || window.confirm('You have unsaved changes. Discard them?');

  async function openPersona(id) {
    if (busy || id === currentId && !dirty) return;
    if (!confirmDiscard()) return;
    busy = true;
    setState('Opening…');
    try {
      const { persona } = await api('GET', '?id=' + encodeURIComponent(id));
      applyValues(persona.form_values);
      currentId = persona.id;
      dirty = false;
      showTitle();
      setState('Saved · ' + timeLabel(persona.updated_at), 'ok');
      await loadList();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setState(error.message, 'error');
    } finally { busy = false; }
  }

  async function savePersona() {
    if (busy) return;
    busy = true;
    ui.save.disabled = true;
    setState('Saving…');
    try {
      sync();
      const values = read();
      const body = { values, persona: build(values) };
      const { persona } = currentId
        ? await api('PUT', '?id=' + encodeURIComponent(currentId), body)
        : await api('POST', '', body);
      // Saved — clear the form so the next persona can be entered straight away.
      await clearForm('Not saved yet');
      toast('Saved “' + persona.title + '”');
      form.elements.title?.focus({ preventScroll: true });
    } catch (error) {
      setState(error.message, 'error');
    } finally {
      busy = false;
      ui.save.disabled = false;
    }
  }

  async function deletePersona(id, title) {
    if (busy || !window.confirm('Delete “' + title + '”? This cannot be undone.')) return;
    busy = true;
    try {
      await api('DELETE', '?id=' + encodeURIComponent(id));
      if (id === currentId) { currentId = null; dirty = true; setState('Deleted · this form is no longer saved', 'error'); }
      await loadList();
    } catch (error) {
      setState(error.message, 'error');
    } finally { busy = false; }
  }

  /** Empties the form for a new persona and refreshes the saved list. */
  async function clearForm(message, tone = '') {
    form.reset();
    currentId = null;
    dirty = false;
    await new Promise(resolve => setTimeout(resolve, 0));   // native values reset after the event
    showTitle();
    setState(message, tone);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await loadList();
  }


  form.addEventListener('input', () => { dirty = true; showTitle(); setState(currentId ? 'Unsaved changes' : 'Not saved yet', 'warn'); });
  form.addEventListener('change', () => { dirty = true; setState(currentId ? 'Unsaved changes' : 'Not saved yet', 'warn'); });
  ui.save.addEventListener('click', savePersona);  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); savePersona(); }
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

  sync();
  loadList();
  // Opened from the saved-personas page: index.html?id=<persona id>
  const startId = new URLSearchParams(window.location.search).get('id');
  if (startId) {
    window.history.replaceState(null, '', window.location.pathname);
    openPersona(startId);
  }
})();
