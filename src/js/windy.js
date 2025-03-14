/*  Global class for simulating the movement of particle through a 1km wind grid

 credit: All the credit for this work goes to: https://github.com/cambecc for creating the repo:
 https://github.com/cambecc/earth. The majority of this code is directly take nfrom there, since its awesome.

 This class takes a canvas element and an array of data (1km GFS from http://www.emc.ncep.noaa.gov/index.php?branch=GFS)
 and then uses a mercator (forward/reverse) projection to correctly map wind vectors in "map space".

 The "start" method takes the bounds of the map at its current extent and starts the whole gridding,
 interpolation and animation process.
 */

const Windy = function(params) {

  if (params.waveMode) {
    const {
      particleAge = 200,
      particleMultiplier = 1 / 10000,
      velocityScale = 0.0045,
    } = params;

    Object.assign(params, {
      velocityScale,
      particleAge,
      lineWidth: 1,
      particleMultiplier,
    });
  }
  const MIN_VELOCITY_INTENSITY = params.minVelocity || 0; // velocity at which particle intensity is minimum (m/s)
  const MAX_VELOCITY_INTENSITY = params.maxVelocity || 10; // velocity at which particle intensity is maximum (m/s)
  const VELOCITY_SCALE =
    (params.velocityScale || 0.005) *
    (Math.pow(window.devicePixelRatio, 1 / 3) || 1); // scale for wind velocity (completely arbitrary--this value looks nice)
  const MAX_PARTICLE_AGE = params.particleAge || 90; // max number of frames a particle is drawn before regeneration
  const PARTICLE_LINE_WIDTH = params.lineWidth || 1; // line width of a drawn particle
  const PARTICLE_MULTIPLIER = params.particleMultiplier || 1 / 300; // particle count scalar (completely arbitrary--this values looks nice)
  const PARTICLE_REDUCTION = Math.pow(window.devicePixelRatio, 1 / 3) || 1.6; // multiply particle count for mobiles by this amount
  const FRAME_RATE = params.frameRate || 15;
  const FRAME_TIME = 1000 / FRAME_RATE; // desired frames per second
  const OPACITY = 0.97;

  const SEPARATION = params.wavesParticlesSeparation || 3.5; // separation of wave particles

  const defaulColorScale = [
    "rgb(36,104, 180)",
    "rgb(60,157, 194)",
    "rgb(128,205,193 )",
    "rgb(151,218,168 )",
    "rgb(198,231,181)",
    "rgb(238,247,217)",
    "rgb(255,238,159)",
    "rgb(252,217,125)",
    "rgb(255,182,100)",
    "rgb(252,150,75)",
    "rgb(250,112,52)",
    "rgb(245,64,32)",
    "rgb(237,45,28)",
    "rgb(220,24,32)",
    "rgb(180,0,35)"
  ];

  const colorScale = params.colorScale || defaulColorScale;

  const NULL_WIND_VECTOR = [NaN, NaN, null]; // singleton for no wind in the form: [u, v, magnitude]

  let builder;
  let grid;
  let gridData = params.data;
  let date;
  let λ0, φ0, Δλ, Δφ, ni, nj;

  const setData = function(data) {
    gridData = data;
  };

  const setOptions = function(options) {
    if (options.hasOwnProperty("minVelocity"))
      MIN_VELOCITY_INTENSITY = options.minVelocity;

    if (options.hasOwnProperty("maxVelocity"))
      MAX_VELOCITY_INTENSITY = options.maxVelocity;

    if (options.hasOwnProperty("velocityScale"))
      VELOCITY_SCALE =
        (options.velocityScale || 0.005) *
        (Math.pow(window.devicePixelRatio, 1 / 3) || 1);

    if (options.hasOwnProperty("particleAge"))
      MAX_PARTICLE_AGE = options.particleAge;

    if (options.hasOwnProperty("lineWidth"))
      PARTICLE_LINE_WIDTH = options.lineWidth;

    if (options.hasOwnProperty("particleMultiplier"))
      PARTICLE_MULTIPLIER = options.particleMultiplier;

    if (options.hasOwnProperty("opacity")) OPACITY = +options.opacity;

    if (options.hasOwnProperty("frameRate")) FRAME_RATE = options.frameRate;
    FRAME_TIME = 1000 / FRAME_RATE;
  };

  const createWindBuilder = function(uComp, vComp, scalar) {
    return {
      header: uComp.header,
      data: function (i) {
        const u = uComp.data[i],
          v = vComp.data[i],
          // if exists scalar field (wave height) use it, otherwise calculate magnitude.
          w = scalar ? scalar.data[i] : Math.sqrt(u * u + v * v);
        return [u, v, w];
      },
  // interpolation for vectors like wind (u,v,m)

      interpolate: function(x, y, g00, g10, g01, g11) {
        const rx = 1 - x,
        ry = 1 - y,
        a = rx * ry,
        b = x * ry,
        c = rx * y,
        d = x * y;
      let u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
      let v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
      const w = scalar
        ? g00[2] * a + g10[2] * b + g01[2] * c + g11[2] * d
        : undefined;
      if (w < 0) {
        u = 0;
        v = 0;
      }
      return [u, v, w];
      }
    };
  };

  const createBuilder = function(data) {
    let uComp = null,
      vComp = null,
      scalar = null;

    data.forEach(function(record) {
      switch (
        record.header.parameterCategory +
        "," +
        record.header.parameterNumber
      ) {
        case "1,2":
        case "2,2":
          uComp = record;
          break;
        case "1,3":
        case "2,3":
          vComp = record;
          break;
        default:
          scalar = record;
      }
    });

    return createWindBuilder(uComp, vComp, scalar);
  };

  const buildGrid = function(data, callback) {
    let supported = true;

    if (data.length < 2 ) supported = false;
    if (!supported) console.log("Windy Error: data must have at least two components (u,v)");
    
    builder = createBuilder(data);
    const header = builder.header;

    if (header.hasOwnProperty("gridDefinitionTemplate") && header.gridDefinitionTemplate != 0 ) supported = false;
    if (!supported) {
      console.log("Windy Error: Only data with Latitude_Longitude coordinates is supported");
    }
    supported = true;  // reset for futher checks
    
    λ0 = header.lo1;
    φ0 = header.la1; // the grid's origin (e.g., 0.0E, 90.0N)

    Δλ = header.dx;
    Δφ = header.dy; // distance between grid points (e.g., 2.5 deg lon, 2.5 deg lat)

    ni = header.nx;
    nj = header.ny; // number of grid points W-E and N-S (e.g., 144 x 73)

    if (header.hasOwnProperty("scanMode")) {
      let scanModeMask = header.scanMode.toString(2)
      scanModeMask = ('0'+scanModeMask).slice(-8);
      const scanModeMaskArray = scanModeMask.split('').map(Number).map(Boolean);

      if (scanModeMaskArray[0]) Δλ =-Δλ;
      if (scanModeMaskArray[1]) Δφ = -Δφ;
      if (scanModeMaskArray[2]) supported = false;
      if (scanModeMaskArray[3]) supported = false;
      if (scanModeMaskArray[4]) supported = false;
      if (scanModeMaskArray[5]) supported = false;
      if (scanModeMaskArray[6]) supported = false;
      if (scanModeMaskArray[7]) supported = false;
      if (!supported) console.log("Windy Error: Data with scanMode: "+header.scanMode+ " is not supported.");
    }
    date = new Date(header.refTime);
    date.setHours(date.getHours() + header.forecastTime);

    // Scan modes 0, 64 allowed.
    // http://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_table3-4.shtml
    grid = [];
    let p = 0;
    const isContinuous = Math.floor(ni * Δλ) >= 360;

    for (let j = 0; j < nj; j++) {
      const row = [];
      for (let i = 0; i < ni; i++, p++) {
        row[i] = builder.data(p);
      }
      if (isContinuous) {
        // For wrapped grids, duplicate first column as last column to simplify interpolation logic
        row.push(row[0]);
      }
      grid[j] = row;
    }

    callback({
      date: date,
      interpolate: interpolate
    });
  };

  /**
   * Get interpolated grid value from Lon/Lat position
   * @param λ {Float} Longitude
   * @param φ {Float} Latitude
   * @returns {Object}
   */
 const interpolate = function(λ, φ) {
    if (!grid) return null;
    const i = floorMod(λ - λ0, 360) / Δλ; // calculate longitude index in wrapped range [0, 360)

    const j = (φ0 - φ) / Δφ; // calculate latitude index in direction +90 to -90

    const fi = Math.floor(i),
      ci = fi + 1;
    const fj = Math.floor(j),
      cj = fj + 1;
    let row;

    row = grid[fj];
    if (row) {
      const g00 = row[fi];
      const g10 = row[ci];

      row = grid[cj];
      if (isValue(g00) && isValue(g10) && row) {
        const g01 = row[fi];
        const g11 = row[ci];

        if (isValue(g01) && isValue(g11)) {
          // All four points found, so interpolate the value.
          return builder.interpolate(i - fi, j - fj, g00, g10, g01, g11);
        }
      }
    }

    return null;
  };

  /**
   * @returns {Boolean} true if the specified value is not null and not undefined.
   */
  const isValue = function(x) {
    return x !== null && x !== undefined;
  };

  /**
   * @returns {Number} returns remainder of floored division, i.e., floor(a / n). Useful for consistent modulo
   *          of negative numbers. See http://en.wikipedia.org/wiki/Modulo_operation.
   */
  const floorMod = function(a, n) {
    return a - n * Math.floor(a / n);
  };


  /**
   * @returns {Boolean} true if agent is probably a mobile device. Don't really care if this is accurate.
   */
  const isMobile = function() {
    return /android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i.test(
      navigator.userAgent
    );
  };


  const distortionCache = {};

  const distortion = function distortion(projection, λ, φ, x, y) {
    const key = `${λ.toFixed(4)}_${φ.toFixed(4)}_${x}_${y}`;
    if (distortionCache[key]) {
      return distortionCache[key];
    }

    const τ = 2 * Math.PI;
    const H = 5;
    const hλ = λ < 0 ? H : -H;
    const hφ = φ < 0 ? H : -H;
    const pλ = project(φ, λ + hλ);
    const pφ = project(φ + hφ, λ);
    const k = Math.cos((φ / 360) * τ);
    const result = [
      (pλ[0] - x) / hλ / k,
      (pλ[1] - y) / hλ / k,
      (pφ[0] - x) / hφ,
      (pφ[1] - y) / hφ,
    ];
    distortionCache[key] = result;
    return result;
  };


  /**
   * Calculate distortion of the wind vector caused by the shape of the projection at point (x, y). The wind
   * vector is modified in place and returned by this function.
   */
  const distort = function(projection, λ, φ, x, y, scale, wind) {
    const u = wind[0] * scale;
    const v = wind[1] * scale;
    const d = distortion(projection, λ, φ, x, y);

    // Scale distortion vectors by u and v, then add.
    wind[0] = d[0] * u + d[2] * v;
    wind[1] = d[1] * u + d[3] * v;
    return wind;
  };


  const createField = function(columns, bounds, callback) {
    /**
     * @returns {Array} wind vector [u, v, magnitude] at the point (x, y), or [NaN, NaN, null] if wind
     *          is undefined at that point.
     */
    function field(x, y) {
      const column = columns[Math.round(x)];
      return (column && column[Math.round(y)]) || NULL_WIND_VECTOR;
    }

    // Frees the massive "columns" array for GC. Without this, the array is leaked (in Chrome) each time a new
    // field is interpolated because the field closure's context is leaked, for reasons that defy explanation.
    field.release = function() {
      columns = [];
    };

    field.randomize = function(o) {
      // UNDONE: this method is terrible
      let x, y;
      let safetyNet = 0;
      do {
        x = Math.round(Math.floor(Math.random() * bounds.width) + bounds.x);
        y = Math.round(Math.floor(Math.random() * bounds.height) + bounds.y);
      } while (field(x, y)[2] === null && safetyNet++ < 30);
      o.x = x;
      o.y = y;
      return o;
    };

    callback(bounds, field);
  };

  const buildBounds = function(bounds, width, height) {
    const upperLeft = bounds[0];
    const lowerRight = bounds[1];
    const x = Math.round(upperLeft[0]); //Math.max(Math.floor(upperLeft[0], 0), 0);
    const y = Math.max(Math.floor(upperLeft[1], 0), 0);
    const yMax = Math.min(Math.ceil(lowerRight[1], height), height - 1);
    return {
      x: x,
      y: y,
      xMax: width,
      yMax: yMax,
      width: width,
      height: height
    };
  };

  const deg2rad = function(deg) {
    return (deg / 180) * Math.PI;
  };

  const invert = function(x, y) {
    const latlon = params.map.containerPointToLatLng(L.point(x, y));
    return [latlon.lng, latlon.lat];
  };

  const project = function(lat, lon) {
    const xy = params.map.latLngToContainerPoint(L.latLng(lat, lon));
    return [xy.x, xy.y];
  };

  const interpolateField = function interpolateField(
    grid,
    bounds,
    extent,
    callback,
  ) {
    const projection = {};
    const mapArea = (extent.south - extent.north) * (extent.west - extent.east);
    const velocityScale = VELOCITY_SCALE * Math.pow(mapArea, 0.4);
    const columns = [];
    let x = bounds.x;

    let step = 2;
    const currentZoom = params.map.getZoom();
    if (currentZoom < 10) {
      step = 4;
    }

    function interpolateColumn(x) {
      const column = [];
      for (let y = bounds.y; y <= bounds.yMax; y += step) {
        const coord = invert(x, y);
        if (coord) {
          const λ = coord[0],
            φ = coord[1];
          if (isFinite(λ)) {
            let wind = grid.interpolate(λ, φ);
            if (wind) {
              wind = distort(projection, λ, φ, x, y, velocityScale, wind);
              column[y + 1] = column[y] = wind;
            }
          }
        }
      }
      columns[x + 1] = columns[x] = column;
    }

    (function batchInterpolate() {
      const start = Date.now();
      while (x < bounds.width) {
        interpolateColumn(x);
        x += step;
        if (Date.now() - start > 300) {
          setTimeout(batchInterpolate, 25);
          return;
        }
      }
      createField(columns, bounds, callback);
    })();
  };

  let animationLoop;
  const animate = function(bounds, field) {
    function windIntensityColorScale(min, max) {
      colorScale.indexFor = function(m) {
        // map velocity speed to a style
        return Math.max(
          0,
          Math.min(
            colorScale.length - 1,
            Math.round(((m - min) / (max - min)) * (colorScale.length - 1))
          )
        );
      };

      return colorScale;
    }

    const colorStyles = windIntensityColorScale(
      MIN_VELOCITY_INTENSITY,
      MAX_VELOCITY_INTENSITY
    );
    const buckets = colorStyles.map(function() {
      return [];
    });

    let particleCount = Math.round(
      bounds.width * bounds.height * PARTICLE_MULTIPLIER
    );
    if (isMobile()) {
      particleCount *= PARTICLE_REDUCTION;
    }

    const fadeOpacity = params.waveMode ? 0.89 : OPACITY;
    const fadeFillStyle = "rgba(0, 0, 0, ".concat(fadeOpacity, ")");

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(
        field.randomize({
          age: Math.floor(Math.random() * MAX_PARTICLE_AGE) + 0
        })
      );
    }

    function evolve() {
      buckets.forEach(function(bucket) {
        bucket.length = 0;
      });
      particles.forEach(function(particle) {
        if (particle.age > MAX_PARTICLE_AGE) {
          field.randomize(particle).age = 0;
        }
        const x = particle.x;
        const y = particle.y;
        const v = field(x, y); // vector at current position
        const m = v[2] || 2;

        particle.waveHeight = m;
        if (m === null) {
          particle.age = MAX_PARTICLE_AGE; // particle has escaped the grid, never to return...
        } else {
          const xt = x + v[0];
          const yt = y + v[1];
          if (field(xt, yt)[2] !== null) {
            // Path from (x,y) to (xt,yt) is visible, so add this particle to the appropriate draw bucket.
            particle.xt = xt;
            particle.yt = yt;
            buckets[colorStyles.indexFor(m)].push(particle);
          } else {
            // Particle isn't visible, but it still moves through the field.
            particle.x = xt;
            particle.y = yt;
          }
        }
        particle.age += 1;
      });
    }

    const g = params.canvas.getContext("2d");
    g.lineWidth = PARTICLE_LINE_WIDTH;
    g.fillStyle = fadeFillStyle;
    g.globalAlpha = params.waveMode ? 0.2 : 0.6;

    function verticalOffset(offset, maxOffset) {
      return 7 * Math.cos((Math.abs(offset) / maxOffset) * (Math.PI / 2));
    }

    function generateOffsets(numPoints) {
      let numDivisions = (numPoints - 1) / 2;
      let offsets = [];
      for (let i = -numDivisions; i <= numDivisions; i++) {
        offsets.push(i);
      }
      return offsets;
    }

    function draw() {
      if (params.waveMode) {
        drawWaves();
      } else {
        drawWind();
      }
    }

    function drawWind() {
      // Fade existing particle trails.
      const prev = "lighter";
      g.globalCompositeOperation = "destination-in";
      g.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      g.globalCompositeOperation = prev;
      g.globalAlpha = OPACITY === 0 ? 0 : OPACITY * 0.9; // Draw new particle trails.

      buckets.forEach(function (bucket, i) {
        if (bucket.length > 0) {
          g.beginPath();
          g.strokeStyle = colorStyles[i];
          bucket.forEach(function (particle) {
            g.moveTo(particle.x, particle.y);
            g.lineTo(particle.xt, particle.yt);
            particle.x = particle.xt;
            particle.y = particle.yt;
          });
          g.stroke();
        }
      });
    }

    function drawWaves() {
      let prev = "lighter";
      g.globalCompositeOperation = "destination-in";
      g.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      g.globalCompositeOperation = prev;
      g.globalAlpha = OPACITY;

      buckets.forEach(function (bucket, i) {
        if (bucket.length > 0) {
          g.beginPath();
          g.strokeStyle = colorStyles[i];
          bucket.forEach(function (particle) {
            let dx = particle.xt - particle.x;
            let dy = particle.yt - particle.y;
            let mag = Math.sqrt(dx * dx + dy * dy);
            let perpX = mag ? -dy / mag : 0;
            let perpY = mag ? dx / mag : 0;
            let normX = mag ? dx / mag : 0;
            let normY = mag ? dy / mag : 0;

            function calculateWaveParticles(waveHeight) {
              if (waveHeight < 0.5) {
                return 4;
              } else if (waveHeight < 0.7) {
                return 5;
              } else if (waveHeight < 1) {
                return 6;
              } else if (waveHeight < 1.5) {
                return 7;
              } else if (waveHeight < 2) {
                return 8;
              } else if (waveHeight < 2.5) {
                return 9;
              } else if (waveHeight < 3) {
                return 10;
              } else if (waveHeight < 4) {
                return 10;
              } else if (waveHeight < 10) {
                return 11;
              } else if (waveHeight < 20) {
                return 12;
              } else if (waveHeight < 30) {
                return 13;
              } else {
                return 14;
              }
            }

            let waveHeight = particle.waveHeight;

            let numWaveParticles = calculateWaveParticles(waveHeight);

            let offSets = generateOffsets(numWaveParticles); // Ahora basado en la altura
            let maxOffset = 4.5; // max offset from the line

            offSets.forEach(function (offset) {
              let shiftX = perpX * offset * SEPARATION;
              let shiftY = perpY * offset * SEPARATION;

              let vOff = verticalOffset(offset, maxOffset);

              let startX = particle.x + shiftX + normX * vOff;
              let startY = particle.y + shiftY + normY * vOff;
              let endX = particle.xt + shiftX + normX * vOff;
              let endY = particle.yt + shiftY + normY * vOff;
              g.moveTo(startX, startY);
              g.lineTo(endX, endY);
            });
            particle.x = particle.xt;
            particle.y = particle.yt;
          });
          g.stroke();
        }
      });
    }

    let then = Date.now();

    (function frame() {
      animationLoop = requestAnimationFrame(frame);
      const now = Date.now();
      const delta = now - then;
      if (delta > FRAME_TIME) {
        then = now - (delta % FRAME_TIME);
        evolve();
        draw();
      }
    })();
  };

  const start = function(bounds, width, height, extent) {
    const mapBounds = {
      south: deg2rad(extent[0][1]),
      north: deg2rad(extent[1][1]),
      east: deg2rad(extent[1][0]),
      west: deg2rad(extent[0][0]),
      width: width,
      height: height
    };

    stop();

    // build grid
    buildGrid(gridData, function(grid) {
      // interpolateField
      interpolateField(
        grid,
        buildBounds(bounds, width, height),
        mapBounds,
        function(bounds, field) {
          // animate the canvas with random points
          windy.field = field;
          animate(bounds, field);
        }
      );
    });
  };

  const stop = function() {
    if (windy.field) windy.field.release();
    if (animationLoop) cancelAnimationFrame(animationLoop);
  };

  const windy = {
    params: params,
    start: start,
    stop: stop,
    createField: createField,
    interpolatePoint: interpolate,
    setData: setData,
    setOptions: setOptions
  };

  return windy;
};

if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = function(id) {
    clearTimeout(id);
  };
}
