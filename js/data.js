/* ================================================================
   CSV PARSING
   ================================================================ */

function parseCSV(text) {

  var lines = text.trim().split(/\r?\n/);

  if (lines.length < 2) return [];

  var headers = parseCsvLine(lines[0]);

  return lines.slice(1).map(function(line) {

    var vals = parseCsvLine(line);
    var obj = {};

    headers.forEach(function(h, i) {
      obj[h.trim()] = (vals[i] || '').trim();
    });

    return obj;

  }).filter(function(row) {
    return Object.values(row).some(function(v) {
      return v;
    });
  });
}


function parseCsvLine(line) {

  var result = [];
  var current = '';
  var inQuotes = false;

  for (var i = 0; i < line.length; i++) {

    var ch = line[i];

    if (ch === '"') {

      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }

    } else if (ch === ',' && !inQuotes) {

      result.push(current);
      current = '';

    } else {

      current += ch;
    }
  }

  result.push(current);

  return result;
}


/* ================================================================
   LOAD RESEARCHES
   Only ResStat = "قيد الدراسة"
   ================================================================ */

async function loadResearches() {

  try {

    var r = await fetch(CONFIG.RESEARCH_CSV_URL);

    if (!r.ok) {
      throw new Error('HTTP ' + r.status);
    }

    var rows = parseCSV(await r.text());

    var idCol     = CONFIG.RES_COLS.id;
    var nameCol   = CONFIG.RES_COLS.name;
    var statusCol = CONFIG.RES_COLS.status;

    _researches = rows
      .map(function(row) {
        return {
          id:     row[idCol] || '',
          name:   row[nameCol] || '',
          status: row[statusCol] || '',
        };
      })
      .filter(function(r) {
        return r.name && r.status.trim() === 'قيد الدراسة';
      });

  } catch (e) {

    console.warn('Research load failed:', e);

    _researches = [];

    showGlobalAlert(
      'error',
      '⚠️ تعذّر تحميل قائمة الأبحاث. تحقق من رابط الجدول.'
    );
  }

  populateAllResearchDropdowns();
}


/* ================================================================
   RESEARCH DROPDOWNS
   ================================================================ */

function populateAllResearchDropdowns() {

  [
    'saved-research',
    'gps-research',
    'link-research'
  ].forEach(function(id) {

    var sel = document.getElementById(id);

    if (!sel) return;

    sel.innerHTML =
      '<option value="">' +
      CONFIG.FREE_MEASUREMENT_LABEL +
      '</option>';

    _researches.forEach(function(r) {

      var opt = document.createElement('option');

      opt.value = r.id || '';
      opt.textContent = r.name;

      sel.appendChild(opt);
    });
  });
}


function onResearchChange(mode) {

  /*
    Research does NOT filter Saved Locations.
    All visible Locations remain available.

    The selected Research is used only when
    opening the Pressure / Flow measurement Forms.
  */

  if (mode === 'saved') {

    _filteredLocs = _locations.slice();

    displayLocations();
  }
}


/* ================================================================
   GET SELECTED RESEARCH
   ================================================================ */

function getSelectedResearch(mode) {

  var el = document.getElementById(mode + '-research');

  if (!el) {
    return {
      id: '',
      name: CONFIG.FREE_MEASUREMENT_LABEL
    };
  }

  var selectedId = el.value;

  if (!selectedId) {
    return {
      id: '',
      name: CONFIG.FREE_MEASUREMENT_LABEL
    };
  }

  var research = _researches.find(function(r) {
    return r.id === selectedId;
  });

  if (research) {
    return {
      id: research.id,
      name: research.name
    };
  }

  return {
    id: selectedId,
    name:
      el.options[el.selectedIndex]
        ? el.options[el.selectedIndex].text
        : ''
  };
}


/* ================================================================
   LOAD LOCATIONS
   ================================================================ */

async function loadLocations() {

  var container =
    document.getElementById('locations-container');

  try {

    var r = await fetch(CONFIG.LOCATION_CSV_URL);

    if (!r.ok) {
      throw new Error('HTTP ' + r.status);
    }

    var rows = parseCSV(await r.text());

    _locations = filterVisibleLocations(rows);

    _filteredLocs = _locations.slice();

    displayLocations();

  } catch (e) {

    console.warn('Locations load failed:', e);

    container.innerHTML =
      '<div class="alert alert-error visible">' +
      '⚠️ تعذّر تحميل المواقع. تحقق من رابط الجدول.' +
      '</div>';
  }
}


/* ================================================================
   FILTER VISIBLE LOCATIONS
   ================================================================ */

function filterVisibleLocations(rows) {

  var col = CONFIG.LOC_COLS.visible;

  return rows.filter(function(row) {

    var val =
      (row[col] || '')
        .toLowerCase()
        .trim();

    return CONFIG.VISIBLE_VALUES.indexOf(val) !== -1;
  });
}


/* ================================================================
   DISPLAY LOCATIONS
   ================================================================ */

function displayLocations() {

  var container =
    document.getElementById('locations-container');

  if (_filteredLocs.length === 0) {

    container.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-icon">📭</div>' +
        '<p>لا توجد مواقع لهذا البحث</p>' +
      '</div>';

    return;
  }

  container.innerHTML = '';

  _filteredLocs.forEach(function(loc, idx) {

    var c = CONFIG.LOC_COLS;

    var latVal = loc[c.lat] || '';
    var lngVal = loc[c.lng] || '';

    var lat =
      latVal
        ? parseFloat(latVal).toFixed(6)
        : '—';

    var lng =
      lngVal
        ? parseFloat(lngVal).toFixed(6)
        : '—';

    var name =
      loc[c.name] || 'موقع غير مسمى';

    var locId =
      loc[c.id] || '';

    var diam =
      loc[c.diameter] || '';

    var mat =
      loc[c.material] || '';

    var pipeId =
      loc[c.pipeId] || '';

    var mapsLink =
      loc[c.mapsLink] ||
      (
        latVal && lngVal
          ? buildGoogleMapsUrl(latVal, lngVal)
          : ''
      );

    var div =
      document.createElement('div');

    div.className = 'location-item';
    div.dataset.idx = idx;

    var idTag = locId
      ? '<span class="loc-id-tag">' +
          escHtml(locId) +
        '</span>'
      : '';

    var diamTag = diam
      ? '<span class="loc-diam-tag">Ø ' +
          escHtml(diam) +
        '</span>'
      : '';

    div.innerHTML =

      '<div class="loc-header">' +
        idTag +
        diamTag +
      '</div>' +

      '<div class="loc-name">' +
        escHtml(name) +
      '</div>' +

      '<div class="loc-meta">' +

        (
          mat
            ? '<span>🔧 ' +
                escHtml(mat) +
              '</span>'
            : ''
        ) +

        (
          pipeId
            ? '<span>🪛 Pipe: ' +
                escHtml(pipeId) +
              '</span>'
            : ''
        ) +

      '</div>' +

      '<div class="loc-details">' +

        '<div class="loc-detail-row">' +
          '<span class="loc-detail-label">LatY:</span>' +
          '<span>' +
            lat +
          '</span>' +
        '</div>' +

        '<div class="loc-detail-row">' +
          '<span class="loc-detail-label">LongX:</span>' +
          '<span>' +
            lng +
          '</span>' +
        '</div>' +

        (
          locId
            ? '<div class="loc-detail-row">' +
                '<span class="loc-detail-label">LocationID:</span>' +
                '<span>' +
                  escHtml(locId) +
                '</span>' +
              '</div>'
            : ''
        ) +

        (
          diam
            ? '<div class="loc-detail-row">' +
                '<span class="loc-detail-label">D:</span>' +
                '<span>' +
                  escHtml(diam) +
                '</span>' +
              '</div>'
            : ''
        ) +

        (
          mat
            ? '<div class="loc-detail-row">' +
                '<span class="loc-detail-label">Mat:</span>' +
                '<span>' +
                  escHtml(mat) +
                '</span>' +
              '</div>'
            : ''
        ) +

        (
          pipeId
            ? '<div class="loc-detail-row">' +
                '<span class="loc-detail-label">PipeID:</span>' +
                '<span>' +
                  escHtml(pipeId) +
                '</span>' +
              '</div>'
            : ''
        ) +

      '</div>' +

      '<div class="action-group">' +

        '<button class="btn btn-maps"' +
          ' onclick="savedOpenMaps(' +
            idx +
            ',event)">' +
          '🗺️ خرائط' +
        '</button>' +

        '<button class="btn btn-pressure"' +
          ' onclick="savedOpenForm(\'pressure\',' +
            idx +
            ',event)">' +
          '📊 ضغط' +
        '</button>' +

        '<button class="btn btn-flow"' +
          ' onclick="savedOpenForm(\'flow\',' +
            idx +
            ',event)">' +
          '💧 تصرف' +
        '</button>' +

      '</div>';

    div.addEventListener('click', function(e) {

      if (e.target.classList.contains('btn')) {
        return;
      }

      selectSavedLocation(div, idx);
    });

    container.appendChild(div);
  });
}


/* ================================================================
   SELECT SAVED LOCATION
   ================================================================ */

function selectSavedLocation(el, idx) {

  document
    .querySelectorAll('.location-item')
    .forEach(function(i) {
      i.classList.remove('selected');
    });

  el.classList.add('selected');

  _savedSelected =
    _filteredLocs[idx];
}


/* ================================================================
   DUPLICATE DETECTION
   ================================================================ */

function checkDuplicateLocation(lat, lng) {

  var tol = CONFIG.DUPLICATE_TOLERANCE_METERS;
  var c   = CONFIG.LOC_COLS;

  return _locations.find(function(loc) {

    var rowLat =
      parseFloat(loc[c.lat]);

    var rowLng =
      parseFloat(loc[c.lng]);

    if (
      isNaN(rowLat) ||
      isNaN(rowLng)
    ) {
      return false;
    }

    return haversineMeters(
      lat,
      lng,
      rowLat,
      rowLng
    ) < tol;

  }) || null;
}


function haversineMeters(
  lat1,
  lng1,
  lat2,
  lng2
) {

  var R = 6371000;

  var φ1 =
    lat1 * Math.PI / 180;

  var φ2 =
    lat2 * Math.PI / 180;

  var Δφ =
    (lat2 - lat1) *
    Math.PI / 180;

  var Δλ =
    (lng2 - lng1) *
    Math.PI / 180;

  var a =
    Math.sin(Δφ / 2) *
    Math.sin(Δφ / 2) +

    Math.cos(φ1) *
    Math.cos(φ2) *
    Math.sin(Δλ / 2) *
    Math.sin(Δλ / 2);

  return R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );
}
