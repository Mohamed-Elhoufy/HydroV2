var CONFIG = {

  /* Google Sheets CSV URLs */
  RESEARCH_CSV_URL:
    'https://docs.google.com/spreadsheets/d/1b3sj2hmu7JzxqxVUU_-Exm82hYughBmt9XR6R8Xf7tY/gviz/tq?tqx=out:csv&sheet=Research',

  LOCATION_CSV_URL:
    'https://docs.google.com/spreadsheets/d/1b3sj2hmu7JzxqxVUU_-Exm82hYughBmt9XR6R8Xf7tY/gviz/tq?tqx=out:csv&sheet=Location',

  /* Apps Script Web App */
  LOCATION_WRITE_API_URL:
    'https://script.google.com/macros/s/AKfycbzYclef94AOtiJWUqtunOzwCwz7OMKX7W4kFx0tlvjP7GkoMH4fjTgjbVs-kk393MMASQ/exec',

  /* Pressure Google Form */
  PRESSURE_FORM_URL:
    'https://docs.google.com/forms/d/e/1FAIpQLScerKzhZhXns4WmO8ccPfbRXo0gaTYq7TVIgZphTEmnj_J8jw/viewform',

  PRESSURE_FIELDS: {
    researchId:   'entry.1226161002',
    researchName: 'entry.600018316',

    locationId:   'entry.689359020',
    locationName: 'entry.482579463',
    locationLink: 'entry.1056624396',

    longX:         'entry.1987306767',
    latY:          'entry.1260809960',
  },

  /* Flow Google Form */
  FLOW_FORM_URL:
    'https://docs.google.com/forms/d/e/1FAIpQLScxQt60ajiKi0BD0VUyxnNi26mmFrTOdqZP9qsKNQIdWSFkGA/viewform',

  FLOW_FIELDS: {
    researchId:   'entry.343098826',
    researchName: 'entry.651076315',

    locationId:   'entry.533052527',
    locationName: 'entry.1012706378',
    locationLink: 'entry.250696972',

    longX:         'entry.480049395',
    latY:         'entry.462372469',
  },

  /* Locations sheet columns */
  LOC_COLS: {
    id:       'LocationID',
    name:     'Location',
    diameter: 'D',
    material: 'Mat',
    lng:      'LongX',
    lat:      'LatY',
    mapsLink: 'MapsLink',
    pipeId:   'PipeID',
    visible:  'Visible',
  },

  /* Research sheet columns */
  RES_COLS: {
    id:     'ResearchID',
    name:   'Research',
    status: 'ResStat',
  },

  /* Visible values */
  VISIBLE_VALUES: ['true', 'yes', '1'],

  /* Duplicate tolerance */
  DUPLICATE_TOLERANCE_METERS: 10,

  /* GPS */
  GPS_TIMEOUT_MS: 15000,
  GPS_MAX_AGE_MS: 0,

  /* GPS accuracy warning */
  GPS_ACCURACY_WARN: 20,

  /* Free measurement */
  FREE_MEASUREMENT_LABEL: 'قياس حر / بدون بحث',
};


/* ================================================================
   STATE
   ================================================================ */

var _researches   = [];
var _locations    = [];
var _filteredLocs = [];

var _savedSelected = null;

var _gpsData  = null;
var _linkData = null;

var _pendingAction = null;
