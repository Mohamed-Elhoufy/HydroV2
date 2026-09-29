/* ================================================================
   INIT
   ================================================================ */

(async function init() {
  await Promise.all([
    loadResearches(),
    loadLocations(),
  ]);
})();


/* ================================================================
   SECTION NAVIGATION
   ================================================================ */

function showSection(name) {

  document.getElementById('main-menu').style.display = 'none';

  document.querySelectorAll('.section').forEach(function(s) {
    s.classList.remove('active');
  });

  document.getElementById(name + '-section').classList.add('active');
}


function goHome() {

  document.querySelectorAll('.section').forEach(function(s) {
    s.classList.remove('active');
  });

  document.getElementById('main-menu').style.display = 'block';

  clearGlobalAlert();
}


/* ================================================================
   SAVED LOCATION ACTIONS
   ================================================================ */

function savedOpenMaps(idx, e) {

  e.stopPropagation();

  var loc = _filteredLocs[idx];
  var c   = CONFIG.LOC_COLS;

  var url =
    loc[c.mapsLink] ||
    buildGoogleMapsUrl(loc[c.lat], loc[c.lng]);

  if (!url) {
    alert('لا يوجد رابط خرائط لهذا الموقع');
    return;
  }

  window.open(url, '_blank');
}


function savedOpenForm(type, idx, e) {

  e.stopPropagation();

  var loc = _filteredLocs[idx];
  var c   = CONFIG.LOC_COLS;

  var locId  = loc[c.id]   || '';
  var name   = loc[c.name] || 'موقع';
  var latVal = loc[c.lat]  || '';
  var lngVal = loc[c.lng]  || '';

  var link =
    loc[c.mapsLink] ||
    (latVal && lngVal ? buildGoogleMapsUrl(latVal, lngVal) : '');

  var research = getSelectedResearch('saved');

  showFormConfirmation(
    type,
    research.id,
    research.name,
    locId,
    name,
    link,
    lngVal,
    latVal
  );
}


/* ================================================================
   GPS
   ================================================================ */

async function getCurrentLocation() {

  var statusEl = document.getElementById('gps-status');
  var coordsEl = document.getElementById('gps-coords');
  var fieldsEl = document.getElementById('gps-fields');

  setGpsStatus('locating', '⏳ جاري تحديد الموقع...');

  coordsEl.classList.remove('visible');
  fieldsEl.style.display = 'none';

  _gpsData = null;

  if (!navigator.geolocation) {

    setGpsStatus(
      'error',
      '❌ المتصفح لا يدعم تحديد الموقع الجغرافي'
    );

    return;
  }

  try {

    var pos = await new Promise(function(resolve, reject) {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout:    CONFIG.GPS_TIMEOUT_MS,
          maximumAge: CONFIG.GPS_MAX_AGE_MS,
        }
      );
    });

    var lat = pos.coords.latitude;
    var lng = pos.coords.longitude;
    var acc = pos.coords.accuracy;

    var mapsLink = buildGoogleMapsUrl(lat, lng);

    _gpsData = {
      lat:        lat,
      lng:        lng,
      accuracy:   acc,
      mapsLink:   mapsLink,
      savedLocId: null
    };

    document.getElementById('gps-lat').textContent = lat.toFixed(6);
    document.getElementById('gps-lng').textContent = lng.toFixed(6);
    document.getElementById('gps-acc').textContent = acc.toFixed(1) + ' م';

    coordsEl.classList.add('visible');
    fieldsEl.style.display = 'block';

    if (acc > CONFIG.GPS_ACCURACY_WARN) {

      setGpsStatus(
        'warn',
        '⚠️ دقة GPS ضعيفة (' + acc.toFixed(0) + ' م). حاول الانتقال لمنطقة مكشوفة.'
      );

    } else {

      setGpsStatus(
        'success',
        '✅ تم تحديد الموقع بنجاح — دقة ' + acc.toFixed(0) + ' م'
      );
    }

  } catch (err) {

    var msgs = {
      1: '❌ تم رفض إذن الوصول للموقع. يرجى السماح للمتصفح بتحديد الموقع.',
      2: '❌ الموقع الجغرافي غير متاح حالياً.',
      3: '❌ انتهت مهلة تحديد الموقع. حاول مرة أخرى.',
    };

    setGpsStatus(
      'error',
      msgs[err.code] || '❌ فشل تحديد الموقع.'
    );
  }
}


function setGpsStatus(type, msg) {

  var el = document.getElementById('gps-status');

  el.className  = 'gps-status-box ' + type;
  el.textContent = msg;
}


/* ================================================================
   GOOGLE MAPS LINK PARSER
   ================================================================ */

function parseGoogleMapsUrl(url) {

  if (!url) return null;

  url = url.trim();

  var m = url.match(/[?&]q=(-?\d+\.?\d*)[,%2C]+(-?\d+\.?\d*)/i);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

  m = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

  m = url.match(/\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

  m = url.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/i);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

  m = url.match(/destination=(-?\d+\.?\d*),(-?\d+\.?\d*)/i);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

  return null;
}


function onLinkInput() {

  var val = document.getElementById('maps-link-input').value;

  document.getElementById('link-clear-btn')
    .classList.toggle('visible', val.length > 0);

  hideAlert('link-parse-alert');

  document.getElementById('link-coords').classList.remove('visible');
  document.getElementById('link-fields').style.display = 'none';

  _linkData = null;
}


function clearLinkInput() {

  document.getElementById('maps-link-input').value = '';

  onLinkInput();
}


async function parseLink() {

  var url = document.getElementById('maps-link-input').value.trim();

  if (!url) {
    showAlert(
      'link-parse-alert',
      'warn',
      '⚠️ الرجاء لصق رابط Google Maps أولاً'
    );
    return;
  }

  var coords = parseGoogleMapsUrl(url);

  if (!coords) {
    showAlert(
      'link-parse-alert',
      'error',
      '❌ تعذّر استخراج الإحداثيات من هذا الرابط. تأكد أنه رابط Google Maps صحيح.'
    );
    return;
  }

  var lat = coords.lat;
  var lng = coords.lng;

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    showAlert(
      'link-parse-alert',
      'error',
      '❌ الإحداثيات المستخرجة غير صالحة.'
    );
    return;
  }

  var mapsLink = buildGoogleMapsUrl(lat, lng);

  _linkData = {
    lat:        lat,
    lng:        lng,
    mapsLink:   mapsLink,
    savedLocId: null
  };

  document.getElementById('link-lat').textContent = lat.toFixed(6);
  document.getElementById('link-lng').textContent = lng.toFixed(6);

  document.getElementById('link-coords').classList.add('visible');
  document.getElementById('link-fields').style.display = 'block';

  hideAlert('link-parse-alert');

  showAlert(
    'link-parse-alert',
    'success',
    '✅ تم استخراج الإحداثيات: ' +
      lat.toFixed(6) +
      ', ' +
      lng.toFixed(6)
  );
}


/* ================================================================
   GOOGLE MAPS URL
   ================================================================ */

function buildGoogleMapsUrl(lat, lng) {
  return 'https://www.google.com/maps?q=' + lat + ',' + lng;
}


/* ================================================================
   OPEN MAPS
   ================================================================ */

function doOpenMaps(mode) {

  var url = getMapsUrl(mode);

  if (!url) return;

  window.open(url, '_blank');
}


function getMapsUrl(mode) {

  if (mode === 'gps'  && _gpsData)  return _gpsData.mapsLink;
  if (mode === 'link' && _linkData) return _linkData.mapsLink;

  return null;
}


/* ================================================================
   FORM OPENING
   Research + Location
   ================================================================ */

function doOpenForm(type, mode) {

  var locId;
  var name;
  var link;
  var latVal;
  var lngVal;

  if (mode === 'gps') {

    if (!_gpsData) {
      showAlert(
        'gps-alert',
        'error',
        '⚠️ يجب تحديد الموقع أولاً'
      );
      return;
    }

    name = document.getElementById('gps-name').value.trim();

    if (!name) {
      showAlert(
        'gps-alert',
        'error',
        '⚠️ الرجاء إدخال اسم الموقع'
      );
      return;
    }

    locId  = _gpsData.savedLocId || '';
    link   = _gpsData.mapsLink;
    latVal = String(_gpsData.lat);
    lngVal = String(_gpsData.lng);

    hideAlert('gps-alert');

  } else if (mode === 'link') {

    if (!_linkData) {
      showAlert(
        'link-alert',
        'error',
        '⚠️ يجب تحليل الرابط أولاً'
      );
      return;
    }

    name = document.getElementById('link-name').value.trim();

    if (!name) {
      showAlert(
        'link-alert',
        'error',
        '⚠️ الرجاء إدخال اسم الموقع'
      );
      return;
    }

    locId  = _linkData.savedLocId || '';
    link   = _linkData.mapsLink;
    latVal = String(_linkData.lat);
    lngVal = String(_linkData.lng);

    hideAlert('link-alert');
  }

  var research = getSelectedResearch(mode);

  showFormConfirmation(
    type,
    research.id,
    research.name,
    locId,
    name,
    link,
    lngVal,
    latVal
  );
}


/* ================================================================
   FORM CONFIRMATION
   ================================================================ */

function showFormConfirmation(
  type,
  researchId,
  researchName,
  locationId,
  locationName,
  locationLink,
  longX,
  latY
) {

  var label =
    type === 'pressure'
      ? 'قياس الضغط 📊'
      : 'قياس التصرف 💧';

  document.getElementById('modal-icon').textContent =
    type === 'pressure' ? '📊' : '💧';

  document.getElementById('modal-title').textContent =
    'تأكيد ' + label;

  document.getElementById('modal-body').innerHTML =
    'هل تريد تسجيل <b>' + label + '</b> للموقع:<br>' +
    '<b>' + escHtml(locationName) + '</b>؟';

  _pendingAction = function() {

    var url = buildPrefilledFormUrl(
      type,
      researchId,
      researchName,
      locationId,
      locationName,
      locationLink,
      longX,
      latY
    );

    window.open(url, '_blank');
  };

  openModal();
}


/* ================================================================
   BUILD PREFILLED FORM URL
   Research + Location
   ================================================================ */

function buildPrefilledFormUrl(
  type,
  researchId,
  researchName,
  locationId,
  locationName,
  locationLink,
  longX,
  latY
) {

  var isPressure = type === 'pressure';

  var base =
    isPressure
      ? CONFIG.PRESSURE_FORM_URL
      : CONFIG.FLOW_FORM_URL;

  var fields =
    isPressure
      ? CONFIG.PRESSURE_FIELDS
      : CONFIG.FLOW_FIELDS;

  var params = new URLSearchParams();

  if (fields.researchId && researchId) {
    params.set(fields.researchId, researchId);
  }

  if (fields.researchName && researchName) {
    params.set(fields.researchName, researchName);
  }

  if (fields.locationId && locationId) {
    params.set(fields.locationId, locationId);
  }

  if (fields.locationName && locationName) {
    params.set(fields.locationName, locationName);
  }

  if (fields.locationLink && locationLink) {
    params.set(fields.locationLink, locationLink);
  }

  if (fields.longX && longX !== '') {
    params.set(fields.longX, longX);
  }

  if (fields.latY && latY !== '') {
    params.set(fields.latY, latY);
  }

  return base + '?' + params.toString();
}


/* ================================================================
   SAVE LOCATION
   ================================================================ */

async function doSaveLocation(mode) {

  var lat;
  var lng;
  var mapsLink;
  var name;

  if (mode === 'gps') {

    if (!_gpsData) {
      showAlert(
        'gps-alert',
        'error',
        '⚠️ يجب تحديد الموقع أولاً'
      );
      return;
    }

    name = document.getElementById('gps-name').value.trim();

    if (!name) {
      showAlert(
        'gps-alert',
        'error',
        '⚠️ الرجاء إدخال اسم الموقع'
      );
      return;
    }

    lat      = _gpsData.lat;
    lng      = _gpsData.lng;
    mapsLink = _gpsData.mapsLink;

    hideAlert('gps-alert');

  } else {

    if (!_linkData) {
      showAlert(
        'link-alert',
        'error',
        '⚠️ يجب تحليل الرابط أولاً'
      );
      return;
    }

    name = document.getElementById('link-name').value.trim();

    if (!name) {
      showAlert(
        'link-alert',
        'error',
        '⚠️ الرجاء إدخال اسم الموقع'
      );
      return;
    }

    lat      = _linkData.lat;
    lng      = _linkData.lng;
    mapsLink = _linkData.mapsLink;

    hideAlert('link-alert');
  }

  var alertId = mode + '-alert';

  /* ── Get selected Research ───────────────────────────────── */

  var research = getSelectedResearch(mode);

  /*
    ResearchID creates the relationship:

    Research (1) ─────< Location (Many)
  */

  var researchId = research.id || '';

  /* ── Client-side duplicate check ─────────────────────────── */

  var dup = checkDuplicateLocation(lat, lng);

  if (dup) {

    var c = CONFIG.LOC_COLS;

    showAlert(
      alertId,
      'warn',
      '⚠️ يوجد موقع مشابه بالفعل: "' +
        escHtml(dup[c.name]) +
        '" [' +
        escHtml(dup[c.id]) +
        '] على بُعد أقل من ' +
        CONFIG.DUPLICATE_TOLERANCE_METERS +
        'م. لم يتم الحفظ.'
    );

    return;
  }

  /* ── Payload — backend generates LocationID ──────────────── */

  var c = CONFIG.LOC_COLS;

  var payload = {};

  /*
    ResearchID is the Foreign Key linking
    Location to its Research.
  */
  payload[c.researchId] = researchId;

  payload[c.name]     = name;
  payload[c.lat]      = lat;
  payload[c.lng]      = lng;
  payload[c.mapsLink] = mapsLink;
  payload[c.visible]  = 'TRUE';

  showAlert(
    alertId,
    'info',
    '⏳ جاري حفظ الموقع...'
  );

  try {

    /*
      IMPORTANT:
      Do NOT set Content-Type: application/json here.
      Apps Script Web App can receive the raw body
      without triggering browser CORS preflight.
    */

    var r = await fetch(
      CONFIG.LOCATION_WRITE_API_URL,
      {
        method: 'POST',
        body:   JSON.stringify(payload)
      }
    );

    var json = await r.json();

    if (json.status === 'success') {

      var generatedId = json.locationId || '';

      if (mode === 'gps') {
        _gpsData.savedLocId = generatedId;
      }

      if (mode === 'link') {
        _linkData.savedLocId = generatedId;
      }

      var localEntry = Object.assign({}, payload);

      localEntry[c.id] = generatedId;

      _locations.push(localEntry);
      _filteredLocs = _locations.slice();

      showAlert(
        alertId,
        'success',
        '✅ تم حفظ الموقع "' +
          escHtml(name) +
          '" [' +
          escHtml(generatedId) +
          '] بنجاح'
      );

    } else if (json.status === 'duplicate') {

      if (json.locationId) {

        if (mode === 'gps') {
          _gpsData.savedLocId = json.locationId;
        }

        if (mode === 'link') {
          _linkData.savedLocId = json.locationId;
        }
      }

      showAlert(
        alertId,
        'warn',
        '⚠️ ' +
          (json.message || 'الموقع موجود بالفعل.')
      );

    } else {

      throw new Error(
        json.message || 'Unknown error'
      );
    }

  } catch (e) {

    showAlert(
      alertId,
      'error',
      '❌ فشل حفظ الموقع: ' +
        escHtml(e.message)
    );
  }
}


/* ================================================================
   MODAL
   ================================================================ */

function openModal() {
  document
    .getElementById('modal-overlay')
    .classList.add('active');
}


function closeModal() {

  document
    .getElementById('modal-overlay')
    .classList.remove('active');

  _pendingAction = null;
}


function modalConfirm() {

  var action = _pendingAction;

  closeModal();

  if (action) {
    action();
  }
}


document
  .getElementById('modal-overlay')
  .addEventListener('click', function(e) {

    if (e.target === this) {
      closeModal();
    }

  });


/* ================================================================
   ALERTS
   ================================================================ */

function showAlert(elId, type, msg) {

  var el = document.getElementById(elId);

  if (!el) return;

  el.className =
    'alert alert-' + type + ' visible';

  el.innerHTML = msg;
}


function hideAlert(elId) {

  var el = document.getElementById(elId);

  if (el) {
    el.classList.remove('visible');
  }
}


function showGlobalAlert(type, msg) {

  var el = document.getElementById('global-alert');

  el.className =
    'alert alert-' + type + ' visible';

  el.innerHTML = msg;
}


function clearGlobalAlert() {

  document
    .getElementById('global-alert')
    .classList.remove('visible');
}


/* ================================================================
   UTILITIES
   ================================================================ */

function escHtml(str) {

  if (!str) return '';

  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}