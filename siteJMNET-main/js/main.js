(function () {
  "use strict";

  const WHATSAPP_NUMBER = "557330269305";

  const ITABUNA_CENTER = [-14.7856, -39.2803];

  const ITABUNA_RING = [
    [-14.6928, -39.2907],
    [-14.7557, -39.2617],
    [-14.7583, -39.2471],
    [-14.8577, -39.2405],
    [-14.8482, -39.2357],
    [-14.8444, -39.2076],
    [-14.8716, -39.2231],
    [-14.8850, -39.2201],
    [-14.8981, -39.1910],
    [-14.9088, -39.2112],
    [-14.9381, -39.2404],
    [-14.9309, -39.2599],
    [-14.9357, -39.2806],
    [-14.9298, -39.3019],
    [-14.9157, -39.3065],
    [-14.9318, -39.3281],
    [-14.9667, -39.3563],
    [-14.9768, -39.3666],
    [-14.9895, -39.3541],
    [-15.0197, -39.3666],
    [-15.0271, -39.3862],
    [-15.0236, -39.4041],
    [-15.0332, -39.4124],
    [-15.0119, -39.4189],
    [-14.9729, -39.3931],
    [-14.8971, -39.3650],
    [-14.8651, -39.3597],
    [-14.8515, -39.3647],
    [-14.8578, -39.3945],
    [-14.8372, -39.4050],
    [-14.8115, -39.3955],
    [-14.8067, -39.3855],
    [-14.7812, -39.3752],
    [-14.7593, -39.3553],
    [-14.7282, -39.3517],
    [-14.7238, -39.3434],
    [-14.6928, -39.2907]
  ];

  // Área de cobertura fornecida no arquivo KML da JMNET.
  const COVERAGE_CENTER = [-14.78944961232311, -39.26631149750938];

  const COVERAGE_RING = [
    [-14.76605781553161, -39.25607365596952],
    [-14.76100188195086, -39.25915830604708],
    [-14.76334305946278, -39.26606065407290],
    [-14.77087703506298, -39.27935859044342],
    [-14.77913357804394, -39.28672512813652],
    [-14.78391133340598, -39.29256409354424],
    [-14.78732406790651, -39.29462211497030],
    [-14.79101725456559, -39.29198379999794],
    [-14.79727388623563, -39.29057938580910],
    [-14.79833007102829, -39.29205008480626],
    [-14.79574572787955, -39.29596490705060],
    [-14.79501696905382, -39.29856677125947],
    [-14.79765422012084, -39.30118744888809],
    [-14.80351082250829, -39.29366724136318],
    [-14.80567128487629, -39.29659696075400],
    [-14.81032591997588, -39.29894619597377],
    [-14.80768642667746, -39.30414643410819],
    [-14.81013825334967, -39.31197236927684],
    [-14.81520017813185, -39.31625044889859],
    [-14.82035321323924, -39.31484673293721],
    [-14.82502907688552, -39.31151844546379],
    [-14.81856293924390, -39.30013785384300],
    [-14.81748941143454, -39.29723747640193],
    [-14.81748941143454, -39.29723747640193],
    [-14.82219232461326, -39.29782220111488],
    [-14.82412124967264, -39.29288406120695],
    [-14.82096466251883, -39.28743428387278],
    [-14.82099362542578, -39.28533963278889],
    [-14.82498483810645, -39.28009214032794],
    [-14.82110322016922, -39.27174387208303],
    [-14.81941932371259, -39.26284032943455],
    [-14.80673485533224, -39.26036988577373],
    [-14.79465388302542, -39.26010703134825],
    [-14.79107436992991, -39.25464287937268],
    [-14.78265160570722, -39.25971848012239],
    [-14.78077759532795, -39.25634715022556],
    [-14.77566301357937, -39.25532794273212],
    [-14.76605781553161, -39.25607365596952]
  ];

  let coverageMap = null;
  let addressMarker = null;
  let suggestionTimer = null;
  let latestSearchId = 0;

  /*
   * --------------------------------------------------------------------------
   * STORAGE
   * --------------------------------------------------------------------------
   */

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // O site continua funcionando mesmo quando o navegador bloqueia storage.
    }
  }

  /*
   * --------------------------------------------------------------------------
   * UTILITÁRIOS
   * --------------------------------------------------------------------------
   */

  function renderIcons() {
    if (
      window.lucide &&
      typeof window.lucide.createIcons === "function"
    ) {
      window.lucide.createIcons({
        attrs: {
          "aria-hidden": "true",
          "stroke-width": 2
        }
      });
    }
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isExcludedRegion(value) {
    const text = normalize(value);

    return (
      text.includes("nova ferradas") ||
      text.includes("ferradas")
    );
  }

  /*
   * --------------------------------------------------------------------------
   * GEOLOCALIZAÇÃO / POLÍGONOS
   * --------------------------------------------------------------------------
   */

  function pointInsideRing(latitude, longitude, ring) {
    let inside = false;

    for (
      let current = 0, previous = ring.length - 1;
      current < ring.length;
      previous = current++
    ) {
      const currentLatitude = ring[current][0];
      const currentLongitude = ring[current][1];

      const previousLatitude = ring[previous][0];
      const previousLongitude = ring[previous][1];

      const crosses =
        (currentLatitude > latitude) !==
          (previousLatitude > latitude) &&
        longitude <
          (
            (previousLongitude - currentLongitude) *
              (latitude - currentLatitude)
          ) /
            (previousLatitude - currentLatitude) +
            currentLongitude;

      if (crosses) {
        inside = !inside;
      }
    }

    return inside;
  }

  function pointInsideItabuna(latitude, longitude) {
    return pointInsideRing(
      latitude,
      longitude,
      ITABUNA_RING
    );
  }

  function pointInsideCoverage(latitude, longitude) {
    return pointInsideRing(
      latitude,
      longitude,
      COVERAGE_RING
    );
  }

  /*
   * --------------------------------------------------------------------------
   * TEMA
   * --------------------------------------------------------------------------
   */

  function setupTheme() {
    const themeButton = document.getElementById("theme-button");
    const themes = ["system", "light", "dark"];

    let preference =
      storageGet("jmnet-theme") || "system";

    if (!themes.includes(preference)) {
      preference = "system";
    }

    function applyTheme() {
      const prefersDark =
        window.matchMedia &&
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;

      const resolved =
        preference === "system"
          ? prefersDark
            ? "dark"
            : "light"
          : preference;

      document.documentElement.dataset.theme =
        resolved;

      document.documentElement.dataset.themePreference =
        preference;

      if (themeButton) {
        const icon =
          preference === "dark"
            ? "moon"
            : preference === "light"
              ? "sun"
              : "moon";

        const label =
          preference === "dark"
            ? "escuro"
            : preference === "light"
              ? "claro"
              : "automático";

        themeButton.innerHTML =
          '<i data-lucide="' + icon + '"></i>';

        themeButton.setAttribute(
          "aria-label",
          "Tema atual: " +
            label +
            ". Alternar tema"
        );

        renderIcons();
      }
    }

    applyTheme();

    if (themeButton) {
      themeButton.addEventListener(
        "click",
        function () {
          const currentIndex =
            themes.indexOf(preference);

          preference =
            themes[
              (currentIndex + 1) % themes.length
            ];

          storageSet(
            "jmnet-theme",
            preference
          );

          applyTheme();
        }
      );
    }

    if (window.matchMedia) {
      const media = window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

      if (
        typeof media.addEventListener ===
        "function"
      ) {
        media.addEventListener(
          "change",
          function () {
            if (preference === "system") {
              applyTheme();
            }
          }
        );
      }
    }
  }

  /*
   * --------------------------------------------------------------------------
   * NAVEGAÇÃO
   * --------------------------------------------------------------------------
   */

  function setupNavigation() {
    const menuButton =
      document.getElementById("menu-button");

    const mobileMenu =
      document.getElementById("mobile-menu");

    if (!menuButton || !mobileMenu) {
      return;
    }

    function setMenu(open) {
      mobileMenu.hidden = !open;

      menuButton.setAttribute(
        "aria-expanded",
        String(open)
      );

      menuButton.setAttribute(
        "aria-label",
        open
          ? "Fechar menu"
          : "Abrir menu"
      );

      menuButton.innerHTML =
        '<i data-lucide="' +
        (open ? "x" : "menu") +
        '"></i>';

      renderIcons();
    }

    setMenu(false);

    menuButton.addEventListener(
      "click",
      function () {
        setMenu(mobileMenu.hidden);
      }
    );

    mobileMenu
      .querySelectorAll("a")
      .forEach(function (link) {
        link.addEventListener(
          "click",
          function () {
            setMenu(false);
          }
        );
      });
  }

  /*
   * --------------------------------------------------------------------------
   * ACESSIBILIDADE
   * --------------------------------------------------------------------------
   */

  function setupAccessibility() {
    const openButton =
      document.getElementById(
        "accessibility-button"
      );

    const closeButton =
      document.getElementById(
        "accessibility-close"
      );

    const panel =
      document.getElementById(
        "accessibility-panel"
      );

    const contrastButton =
      document.getElementById(
        "contrast-button"
      );

    if (!panel || !openButton) {
      return;
    }

    function setOpen(open) {
      panel.hidden = !open;

      openButton.setAttribute(
        "aria-expanded",
        String(open)
      );

      if (open && closeButton) {
        closeButton.focus();
      }
    }

    setOpen(false);

    openButton.addEventListener(
      "click",
      function () {
        setOpen(panel.hidden);
      }
    );

    if (closeButton) {
      closeButton.addEventListener(
        "click",
        function () {
          setOpen(false);
          openButton.focus();
        }
      );
    }

    panel
      .querySelectorAll(
        "[data-text-scale]"
      )
      .forEach(function (button) {
        button.addEventListener(
          "click",
          function () {
            const scale =
              button.getAttribute(
                "data-text-scale"
              );

            if (scale === "large") {
              document.documentElement.dataset.textScale =
                "large";

              storageSet(
                "jmnet-text-scale",
                "large"
              );
            } else {
              delete document.documentElement
                .dataset.textScale;

              storageSet(
                "jmnet-text-scale",
                "normal"
              );
            }
          }
        );
      });

    if (
      storageGet("jmnet-text-scale") ===
      "large"
    ) {
      document.documentElement.dataset.textScale =
        "large";
    }

    if (
      storageGet("jmnet-contrast") ===
      "high"
    ) {
      document.documentElement.dataset.contrast =
        "high";
    }

    if (contrastButton) {
      contrastButton.addEventListener(
        "click",
        function () {
          const isHigh =
            document.documentElement.dataset
              .contrast === "high";

          if (isHigh) {
            delete document.documentElement
              .dataset.contrast;

            storageSet(
              "jmnet-contrast",
              "normal"
            );
          } else {
            document.documentElement.dataset.contrast =
              "high";

            storageSet(
              "jmnet-contrast",
              "high"
            );
          }
        }
      );
    }

    document.addEventListener(
      "keydown",
      function (event) {
        if (
          event.key === "Escape" &&
          !panel.hidden
        ) {
          setOpen(false);
          openButton.focus();
        }
      }
    );
  }

  /*
   * --------------------------------------------------------------------------
   * ANIMAÇÕES
   * --------------------------------------------------------------------------
   */

  function setupRevealAnimations() {
    const elements = Array.from(
      document.querySelectorAll(".reveal")
    );

    if (
      !("IntersectionObserver" in window)
    ) {
      elements.forEach(function (element) {
        element.classList.add(
          "is-visible"
        );
      });

      return;
    }

    const observer =
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add(
              "is-visible"
            );

            observer.unobserve(
              entry.target
            );
          });
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -40px"
        }
      );

    elements.forEach(function (element) {
      if (
        !element.classList.contains(
          "is-visible"
        )
      ) {
        observer.observe(element);
      }
    });
  }

  /*
   * --------------------------------------------------------------------------
   * BOTÕES DE APLICATIVO
   * --------------------------------------------------------------------------
   */

  function setupAppButtons() {
    const agent =
      navigator.userAgent.toLowerCase();

    const platform =
      /iphone|ipad|ipod/.test(agent)
        ? "ios"
        : /android/.test(agent)
          ? "android"
          : "other";

    const priorityButton =
      document.querySelector(
        '[data-platform="' +
          platform +
          '"]'
      );

    if (priorityButton) {
      priorityButton.classList.add(
        "is-priority"
      );
    }
  }

  /*
   * --------------------------------------------------------------------------
   * COOKIES
   * --------------------------------------------------------------------------
   */

  function setupCookieBanner() {
    const banner =
      document.getElementById(
        "cookie-banner"
      );

    if (!banner) {
      return;
    }

    const options =
      document.getElementById(
        "cookie-options"
      );

    const acceptButton =
      document.getElementById(
        "accept-cookies"
      );

    const rejectButton =
      document.getElementById(
        "reject-cookies"
      );

    const customizeButton =
      document.getElementById(
        "customize-cookies"
      );

    const saveButton =
      document.getElementById(
        "save-cookies"
      );

    const settingsTriggers =
      document.querySelectorAll(
        "[data-cookie-settings-trigger]"
      );

    function savePreferences(
      preferences
    ) {
      storageSet(
        "jmnet-cookie-consent-v2",
        JSON.stringify({
          essential: true,
          functional: Boolean(
            preferences.functional
          ),
          analytics: Boolean(
            preferences.analytics
          ),
          marketing: Boolean(
            preferences.marketing
          ),
          updatedAt:
            new Date().toISOString()
        })
      );

      banner.hidden = true;
    }

    banner.hidden = Boolean(
      storageGet(
        "jmnet-cookie-consent-v2"
      )
    );

    if (acceptButton) {
      acceptButton.addEventListener(
        "click",
        function () {
          savePreferences({
            functional: true,
            analytics: true,
            marketing: true
          });
        }
      );
    }

    if (rejectButton) {
      rejectButton.addEventListener(
        "click",
        function () {
          savePreferences({
            functional: false,
            analytics: false,
            marketing: false
          });
        }
      );
    }

    if (
      customizeButton &&
      options &&
      saveButton
    ) {
      customizeButton.addEventListener(
        "click",
        function () {
          options.hidden = false;
          customizeButton.hidden = true;
          saveButton.hidden = false;
        }
      );
    }

    if (saveButton) {
      saveButton.addEventListener(
        "click",
        function () {
          const functional =
            document.getElementById(
              "cookie-functional"
            );

          const analytics =
            document.getElementById(
              "cookie-analytics"
            );

          const marketing =
            document.getElementById(
              "cookie-marketing"
            );

          savePreferences({
            functional:
              functional
                ? functional.checked
                : false,

            analytics:
              analytics
                ? analytics.checked
                : false,

            marketing:
              marketing
                ? marketing.checked
                : false
          });
        }
      );
    }

    settingsTriggers.forEach(
      function (trigger) {
        trigger.addEventListener(
          "click",
          function () {
            banner.hidden = false;
          }
        );
      }
    );
  }

  /*
   * --------------------------------------------------------------------------
   * MAPA
   * --------------------------------------------------------------------------
   */

  function initializeMap() {
    const mapElement =
      document.getElementById(
        "coverage-map"
      );

    const loadingElement =
      document.getElementById(
        "map-loading"
      );

    if (!mapElement) {
      return;
    }

    if (!window.L) {
      if (loadingElement) {
        loadingElement.innerHTML =
          "<strong>Mapa indisponível sem internet</strong>" +
          "<small>Conecte-se à internet e atualize a página.</small>";
      }

      return;
    }

    coverageMap = window.L.map(
      mapElement,
      {
        zoomControl: true,
        scrollWheelZoom: false,
        minZoom: 8,
        maxZoom: 19
      }
    ).setView(
      COVERAGE_CENTER,
      13
    );

    window.L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution:
          "Imagens © Esri, Maxar, Earthstar Geographics e comunidade GIS"
      }
    ).addTo(coverageMap);

    window.L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        opacity: 0.78,
        attribution:
          "Referências © Esri"
      }
    ).addTo(coverageMap);

    const worldRing = [
      [90, -180],
      [90, 180],
      [-90, 180],
      [-90, -180],
      [90, -180]
    ];

    window.L.polygon(
      [worldRing, COVERAGE_RING],
      {
        stroke: false,
        fill: true,
        fillColor: "#020704",
        fillOpacity: 0.8,
        fillRule: "evenodd",
        interactive: false
      }
    ).addTo(coverageMap);

    const outline =
      window.L.polygon(
        COVERAGE_RING,
        {
          color: "#41ff6a",
          weight: 3,
          opacity: 0.95,
          fill: false,
          interactive: false
        }
      ).addTo(coverageMap);

    coverageMap.fitBounds(
      outline.getBounds(),
      {
        padding: [16, 16],
        maxZoom: 14
      }
    );

    window.setTimeout(
      function () {
        if (coverageMap) {
          coverageMap.invalidateSize();
        }

        if (loadingElement) {
          loadingElement.remove();
        }
      },
      300
    );
  }

  /*
   * --------------------------------------------------------------------------
   * BUSCA DE ENDEREÇOS
   * --------------------------------------------------------------------------
   */

  function cityMatchesItabuna(parts) {
    const locality = normalize(
      parts
        .filter(Boolean)
        .join(" ")
    );

    return locality.includes(
      "itabuna"
    );
  }

  function uniqueResults(results) {
    return results
      .filter(function (
        item,
        index,
        items
      ) {
        return (
          items.findIndex(
            function (candidate) {
              return (
                candidate.label ===
                item.label
              );
            }
          ) === index
        );
      })
      .slice(0, 5);
  }

  async function searchPhoton(query) {
    const url = new URL(
      "https://photon.komoot.io/api/"
    );

    url.searchParams.set(
      "q",
      query + ", Itabuna, Bahia"
    );

    url.searchParams.set(
      "lang",
      "pt"
    );

    url.searchParams.set(
      "limit",
      "8"
    );

    url.searchParams.set(
      "bbox",
      "-39.52,-15.08,-39.08,-14.56"
    );

    const response = await fetch(
      url.toString(),
      {
        headers: {
          Accept:
            "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        "Falha na primeira fonte de endereço."
      );
    }

    const data =
      await response.json();

    const results =
      (data.features || [])
        .filter(function (feature) {
          const properties =
            feature.properties || {};

          return cityMatchesItabuna([
            properties.city,
            properties.county,
            properties.district
          ]);
        })
        .map(function (feature) {
          const properties =
            feature.properties || {};

          const street =
            properties.street ||
            properties.name ||
            "Endereço";

          const number =
            properties.housenumber
              ? ", " +
                properties.housenumber
              : "";

          const district =
            properties.district ||
            "";

          const city =
            properties.city ||
            properties.county ||
            "Itabuna";

          const postcode =
            properties.postcode ||
            "";

          return {
            label:
              street +
              number +
              (district
                ? " — " +
                  district
                : "") +
              ", " +
              city +
              " - BA" +
              (postcode
                ? " • " +
                  postcode
                : ""),

            latitude: Number(
              feature.geometry
                .coordinates[1]
            ),

            longitude: Number(
              feature.geometry
                .coordinates[0]
            ),

            district:
              district,

            city:
              city,

            postcode:
              postcode
          };
        })
        .filter(function (item) {
          return (
            Number.isFinite(
              item.latitude
            ) &&
            Number.isFinite(
              item.longitude
            ) &&
            pointInsideItabuna(
              item.latitude,
              item.longitude
            )
          );
        });

    return uniqueResults(
      results
    );
  }

  async function searchNominatim(query) {
    const url = new URL(
      "https://nominatim.openstreetmap.org/search"
    );

    url.searchParams.set(
      "q",
      query + ", Itabuna, Bahia"
    );

    url.searchParams.set(
      "format",
      "jsonv2"
    );

    url.searchParams.set(
      "addressdetails",
      "1"
    );

    url.searchParams.set(
      "countrycodes",
      "br"
    );

    url.searchParams.set(
      "limit",
      "5"
    );

    url.searchParams.set(
      "viewbox",
      "-39.52,-14.56,-39.08,-15.08"
    );

    url.searchParams.set(
      "bounded",
      "1"
    );

    const response = await fetch(
      url.toString(),
      {
        headers: {
          Accept:
            "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        "Falha na segunda fonte de endereço."
      );
    }

    const data =
      await response.json();

    const results =
      data
        .filter(function (item) {
          const address =
            item.address || {};

          return cityMatchesItabuna([
            address.city,
            address.town,
            address.municipality,
            address.suburb,
            address.neighbourhood,
            item.display_name
          ]);
        })
        .map(function (item) {
          const address =
            item.address || {};

          const street =
            address.road ||
            item.name ||
            "Endereço";

          const number =
            address.house_number
              ? ", " +
                address.house_number
              : "";

          const district =
            address.suburb ||
            address.neighbourhood ||
            "";

          const city =
            address.city ||
            address.town ||
            address.municipality ||
            "Itabuna";

          const postcode =
            address.postcode ||
            "";

          return {
            label:
              street +
              number +
              (district
                ? " — " +
                  district
                : "") +
              ", " +
              city +
              " - BA" +
              (postcode
                ? " • " +
                  postcode
                : ""),

            latitude: Number(
              item.lat
            ),

            longitude: Number(
              item.lon
            ),

            district:
              district,

            city:
              city,

            postcode:
              postcode
          };
        })
        .filter(function (item) {
          return (
            Number.isFinite(
              item.latitude
            ) &&
            Number.isFinite(
              item.longitude
            ) &&
            pointInsideItabuna(
              item.latitude,
              item.longitude
            )
          );
        });

    return uniqueResults(
      results
    );
  }

  function scoreAddressResult(
    result,
    query
  ) {
    const normalizedQuery =
      normalize(query);

    const normalizedLabel =
      normalize(result.label);

    const queryWords =
      normalizedQuery
        .split(/\s+/)
        .filter(function (word) {
          return word.length > 2;
        });

    const requestedNumbers =
      normalizedQuery.match(
        /\b\d+[a-z]?\b/gi
      ) || [];

    let score = 0;

    queryWords.forEach(
      function (word) {
        if (
          normalizedLabel.includes(
            word
          )
        ) {
          score += 5;
        }
      }
    );

    requestedNumbers.forEach(
      function (number) {
        if (
          normalizedLabel.includes(
            normalize(number)
          )
        ) {
          score += 40;
        }
      }
    );

    if (result.postcode) {
      score += 10;
    }

    if (result.district) {
      score += 5;
    }

    if (
      normalize(result.city).includes(
        "itabuna"
      )
    ) {
      score += 20;
    }

    return score;
  }

  async function geocodeAddress(
    query
  ) {
    const searches =
      await Promise.allSettled([
        searchNominatim(query),
        searchPhoton(query)
      ]);

    const nominatimResults =
      searches[0].status ===
      "fulfilled"
        ? searches[0].value
        : [];

    const photonResults =
      searches[1].status ===
      "fulfilled"
        ? searches[1].value
        : [];

    const combinedResults = [
      ...nominatimResults,
      ...photonResults
    ];

    const validResults =
      combinedResults.filter(
        function (item) {
          return (
            Number.isFinite(
              item.latitude
            ) &&
            Number.isFinite(
              item.longitude
            ) &&
            cityMatchesItabuna([
              item.city,
              item.district,
              item.label
            ])
          );
        }
      );

    const resultsWithoutDuplicates =
      validResults.filter(
        function (
          item,
          index,
          items
        ) {
          return (
            items.findIndex(
              function (candidate) {
                const sameLatitude =
                  Math.abs(
                    candidate.latitude -
                      item.latitude
                  ) < 0.00005;

                const sameLongitude =
                  Math.abs(
                    candidate.longitude -
                      item.longitude
                  ) < 0.00005;

                return (
                  sameLatitude &&
                  sameLongitude
                );
              }
            ) === index
          );
        }
      );

    return resultsWithoutDuplicates
      .sort(function (a, b) {
        return (
          scoreAddressResult(
            b,
            query
          ) -
          scoreAddressResult(
            a,
            query
          )
        );
      })
      .slice(0, 5);
  }

  /*
   * --------------------------------------------------------------------------
   * CEP
   * --------------------------------------------------------------------------
   */

  async function lookupCep(cep) {
    const cleanCep =
      String(cep || "")
        .replace(/\D/g, "");

    if (cleanCep.length !== 8) {
      throw new Error(
        "Digite um CEP válido com 8 números."
      );
    }

    const response =
      await fetch(
        "https://viacep.com.br/ws/" +
          cleanCep +
          "/json/"
      );

    if (!response.ok) {
      throw new Error(
        "Não foi possível consultar o CEP."
      );
    }

    const data =
      await response.json();

    if (data.erro) {
      throw new Error(
        "CEP não encontrado."
      );
    }

    if (
      normalize(data.localidade) !==
        "itabuna" ||
      data.uf !== "BA"
    ) {
      throw new Error(
        "Este CEP não pertence a Itabuna–BA."
      );
    }

    const addressQuery = [
      data.logradouro,
      data.bairro
    ]
      .filter(Boolean)
      .join(", ");

    const geocoded =
      await geocodeAddress(
        addressQuery ||
          data.cep ||
          cleanCep
      );

    if (geocoded.length) {
      return geocoded.map(
        function (item) {
          return Object.assign(
            {},
            item,
            {
              postcode:
                data.cep,

              district:
                data.bairro ||
                item.district,

              label:
                (
                  data.logradouro ||
                  "CEP"
                ) +
                (
                  data.bairro
                    ? " — " +
                      data.bairro
                    : ""
                ) +
                ", Itabuna - BA • " +
                data.cep
            }
          );
        }
      );
    }

    throw new Error(
      "O CEP foi encontrado, mas não foi possível determinar sua localização exata. Digite também o nome da rua e o número do imóvel."
    );
  }

  async function runAddressSearch(
    query
  ) {
    const cleanQuery =
      String(query || "").trim();

    if (cleanQuery.length < 3) {
      throw new Error(
        "Digite uma rua, bairro ou CEP de Itabuna."
      );
    }

    const digits =
      cleanQuery.replace(
        /\D/g,
        ""
      );

    const isOnlyCepCharacters =
      /^[\d.\-\s]+$/.test(
        cleanQuery
      );

    if (
      digits.length === 8 &&
      isOnlyCepCharacters
    ) {
      return lookupCep(
        digits
      );
    }

    return geocodeAddress(
      cleanQuery
    );
  }

  /*
   * --------------------------------------------------------------------------
   * RESULTADOS DE COBERTURA
   * --------------------------------------------------------------------------
   */

  function setupCoverageSearch() {
    const form =
      document.getElementById(
        "coverage-search"
      );

    const input =
      document.getElementById(
        "address-query"
      );

    const suggestions =
      document.getElementById(
        "search-suggestions"
      );

    const status =
      document.getElementById(
        "search-status"
      );

    const resultCard =
      document.getElementById(
        "coverage-result"
      );

    if (
      !form ||
      !input ||
      !suggestions ||
      !status ||
      !resultCard
    ) {
      return;
    }

    const submitButton =
      form.querySelector(
        'button[type="submit"]'
      );

    function setLoading(
      loading,
      message
    ) {
      if (submitButton) {
        submitButton.disabled =
          loading;
      }

      status.className =
        "search-status" +
        (
          loading
            ? " loading"
            : ""
        );

      status.textContent =
        message || "";
    }

    function hideSuggestions() {
      suggestions.hidden = true;
      suggestions.innerHTML = "";
    }

    function showError(message) {
      hideSuggestions();

      resultCard.hidden = true;

      status.className =
        "search-status error";

      const safeMessage =
        escapeHTML(message);

      const mapsUrl =
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(
          input.value +
            ", Itabuna, BA"
        );

      status.innerHTML =
        safeMessage +
        ' <a href="' +
        mapsUrl +
        '" target="_blank" rel="noopener noreferrer">Abrir busca no Google Maps</a>';
    }

    function showSuggestions(
      results
    ) {
      if (!results.length) {
        hideSuggestions();
        return;
      }

      suggestions.innerHTML = "";

      results.forEach(
        function (result) {
          const button =
            document.createElement(
              "button"
            );

          button.type = "button";

          button.setAttribute(
            "role",
            "option"
          );

          button.innerHTML =
            '<i data-lucide="map-pin"></i>' +
            "<span>" +
            escapeHTML(
              result.label
            ) +
            "</span>";

          button.addEventListener(
            "click",
            function () {
              chooseResult(
                result
              );
            }
          );

          suggestions.appendChild(
            button
          );
        }
      );

      suggestions.hidden = false;

      renderIcons();
    }

    function chooseResult(
      result
    ) {
      hideSuggestions();

      input.value =
        result.label;

      status.textContent = "";

      status.className =
        "search-status";

      const excluded =
        isExcludedRegion(
          result.district +
            " " +
            result.label
        );

      const inside =
        pointInsideItabuna(
          result.latitude,
          result.longitude
        );

      const insideCoverage =
        pointInsideCoverage(
          result.latitude,
          result.longitude
        );

      if (
        coverageMap &&
        window.L
      ) {
        if (addressMarker) {
          coverageMap.removeLayer(
            addressMarker
          );
        }

        const markerIcon =
          window.L.divIcon({
            className:
              "jmnet-marker",

            html: "",

            iconSize: [
              24,
              24
            ],

            iconAnchor: [
              12,
              24
            ]
          });

        addressMarker =
          window.L.marker(
            [
              result.latitude,
              result.longitude
            ],
            {
              icon:
                markerIcon
            }
          ).addTo(
            coverageMap
          );

        coverageMap.flyTo(
          [
            result.latitude,
            result.longitude
          ],
          16,
          {
            duration: 1.1
          }
        );
      }

      resultCard.hidden = false;

      /*
       * FERRADAS / NOVA FERRADAS
       */
      if (excluded) {
        resultCard.className =
          "coverage-result-card is-excluded";

        resultCard.innerHTML =
          "<strong>Localidade fora da área comercial informada</strong>" +
          "<p>Ferradas e Nova Ferradas não estão contempladas na regra comercial fornecida. Fale com a equipe para receber uma orientação atualizada.</p>" +
          '<a href="https://wa.me/' +
          WHATSAPP_NUMBER +
          "?text=" +
          encodeURIComponent(
            "Olá! Quero consultar a cobertura para: " +
              result.label
          ) +
          '" target="_blank" rel="noopener noreferrer">Falar com a JMNET →</a>';

        return;
      }

      /*
       * FORA DO MUNICÍPIO
       */
      if (!inside) {
        resultCard.className =
          "coverage-result-card is-excluded";

        resultCard.innerHTML =
          "<strong>Endereço fora do limite de Itabuna</strong>" +
          "<p>Esta busca foi configurada exclusivamente para Itabuna–BA.</p>";

        return;
      }

      /*
       * DENTRO DE ITABUNA, MAS FORA DA COBERTURA
       */
      if (!insideCoverage) {
        resultCard.className =
          "coverage-result-card is-review";

        resultCard.innerHTML =
          "<strong>Endereço fora da área destacada no mapa</strong>" +
          "<p>" +
          escapeHTML(
            result.label
          ) +
          "<br>O endereço está em Itabuna, mas fora do polígono fornecido. A equipe ainda pode verificar a disponibilidade técnica.</p>" +
          '<a href="https://wa.me/' +
          WHATSAPP_NUMBER +
          "?text=" +
          encodeURIComponent(
            "Olá! Quero verificar a disponibilidade fora da área destacada para: " +
              result.label
          ) +
          '" target="_blank" rel="noopener noreferrer">Solicitar verificação pelo WhatsApp →</a>';

        return;
      }

      /*
       * DENTRO DA ÁREA DE COBERTURA
       */
      resultCard.className =
        "coverage-result-card";

      resultCard.innerHTML =
        "<strong>Endereço localizado na área destacada</strong>" +
        "<p>" +
        escapeHTML(
          result.label
        ) +
        "<br>A disponibilidade ainda depende da análise técnica da JMNET.</p>" +
        '<a href="https://wa.me/' +
        WHATSAPP_NUMBER +
        "?text=" +
        encodeURIComponent(
          "Olá! Quero consultar a disponibilidade para: " +
            result.label
        ) +
        '" target="_blank" rel="noopener noreferrer">Solicitar análise pelo WhatsApp →</a>';
    }

    async function searchAndDisplay(
      query,
      chooseFirst
    ) {
      const requestId =
        ++latestSearchId;

      setLoading(
        true,
        "Pesquisando somente em Itabuna…"
      );

      resultCard.hidden = true;

      try {
        const results =
          await runAddressSearch(
            query
          );

        if (
          requestId !==
          latestSearchId
        ) {
          return;
        }

        setLoading(
          false,
          ""
        );

        if (!results.length) {
          showError(
            "Nenhum endereço de Itabuna foi encontrado. Confira o texto ou tente informar o CEP."
          );

          return;
        }

        const typedNumber =
          String(query).match(
            /\b\d+[a-z]?\b/i
          );

        const resultContainsNumber =
          results.length === 1 &&
          typedNumber &&
          normalize(
            results[0].label
          ).includes(
            normalize(
              typedNumber[0]
            )
          );

        if (
          chooseFirst &&
          results.length === 1 &&
          resultContainsNumber
        ) {
          chooseResult(
            results[0]
          );

          return;
        }

        showSuggestions(
          results
        );

        status.textContent =
          results.length === 1
            ? "Confira e selecione o endereço encontrado. O mapa será atualizado após a seleção."
            : "Selecione o endereço correto entre as opções encontradas. O mapa será atualizado após a seleção.";

        status.className =
          "search-status";
      } catch (error) {
        if (
          requestId !==
          latestSearchId
        ) {
          return;
        }

        setLoading(
          false,
          ""
        );

        showError(
          error &&
            error.message
            ? error.message
            : "Não foi possível pesquisar agora."
        );
      }
    }

    form.addEventListener(
      "submit",
      function (event) {
        event.preventDefault();

        clearTimeout(
          suggestionTimer
        );

        searchAndDisplay(
          input.value,
          true
        );
      }
    );

    input.addEventListener(
      "input",
      function () {
        clearTimeout(
          suggestionTimer
        );

        hideSuggestions();

        resultCard.hidden = true;

        status.textContent = "";

        status.className =
          "search-status";

        const query =
          input.value.trim();

        const digits =
          query.replace(
            /\D/g,
            ""
          );

        const onlyDigitsCharacters =
          /^[\d.\-\s]+$/.test(
            query
          );

        if (
          query.length < 4 ||
          (
            digits.length > 0 &&
            digits.length < 8 &&
            onlyDigitsCharacters
          )
        ) {
          return;
        }

        suggestionTimer =
          window.setTimeout(
            function () {
              searchAndDisplay(
                query,
                false
              );
            },
            550
          );
      }
    );

    document.addEventListener(
      "click",
      function (event) {
        if (
          !form.contains(
            event.target
          )
        ) {
          hideSuggestions();
        }
      }
    );
  }

  /*
   * --------------------------------------------------------------------------
   * INICIALIZAÇÃO
   * --------------------------------------------------------------------------
   */

  function initialize() {
    const year =
      document.getElementById(
        "current-year"
      );

    if (year) {
      year.textContent =
        String(
          new Date().getFullYear()
        );
    }

    renderIcons();

    setupTheme();

    setupNavigation();

    setupAccessibility();

    setupRevealAnimations();

    setupAppButtons();

    setupCookieBanner();

    initializeMap();

    setupCoverageSearch();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }
})();
