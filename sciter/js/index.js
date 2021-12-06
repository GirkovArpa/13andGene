import { $, $$ } from '@sciter';
import { cwd } from '@sys';
import { launch } from '@env';

import adjustWindow from 'this://app/js/adjust-window.js';
import predictEthnicityPercentages from 'this://app/js/predict-ethnicity-percentages.js';
import parseGEDMatchOutput from 'this://app/js/parse-gedmatch-output.js';
import drawWheel from 'this://app/js/draw-wheel.js';

let sources = {};

fetch(
  `${decodeURIComponent(
    cwd().replace(/\\/g, '/')
  )}/resources/json/k13-sources.json`
)
  .then((resp) => resp.json())
  .then((json) => (sources = json));

adjustWindow();

document.on('DOMContentLoaded', main);

document.on('click', 'a', (evt) => {
  launch(evt.target.attributes.href);
  return true;
});

document.on('click', '#avatar', () => {
  const _filename = Window.this.selectFile({
    filter: 'All Files (*.*)|*.*|',
    mode: 'open',
    path: '',
    caption: 'Select Avatar',
  });
  const filename = decodeURIComponent(_filename?.replace('file://', ''));
  if (filename) {
    $('#avatar').style.backgroundImage = `url('${filename}')`;
    $('#avatar').attributes.initials = '';
  }
});

document.addEventListener('keyup', ({ code }) => {
  if (code === 'KeyF1') {
    Window.this.modal({ url: 'this://app/html/about.html' });
  }
  if (code === 'KeyESCAPE') {
    Window.this.close();
  }
});

document.on('click', 'button#about', () =>
  Window.this.modal({ url: 'this://app/html/about.html' })
);

async function main() {
  $('#name').on('input', function () {
    if ($('#avatar').style.backgroundImage) {
      return;
    }
    const initials = this.value.match(/(?<=\b)[^\s\b]/g) || [];
    $('#avatar').attributes.initials = `${initials[0] || '?'}${
      initials[1] || ''
    }`;
  });

  $('#coords').on('change', function () {
    if (this.value.includes('North_Atlantic')) {
      const parsed = parseGEDMatchOutput(this.value);
      this.value = parsed.join(',');
    }
  });

  $('#calculate').on('click', async function () {
    const coords = $('#coords')
      .value.split(',')
      .map((s) => s.trim())
      .map(Number);

    if (coords.length !== 13) {
      Window.this.modal(
        <error caption="Error">
          You must input 13 coordinates, but you inputted{' '}
          {coords.map(String).filter((s) => s.length).length}.
        </error>
      );
      return;
    }

    $('#coords').value = coords.join(',');

    const indexOfInvalid = coords.findIndex(isNaN);
    if (indexOfInvalid !== -1) {
      Window.this.modal(
        <error caption="Error">
          Invalid value {coords[indexOfInvalid]} in coords at position{' '}
          {indexOfInvalid}.
        </error>
      );
      return;
    }

    const sum = coords.reduce((sum, n) => sum + n, 0);
    if (sum < 98 || sum > 102) {
      Window.this.modal(
        <error caption="Error">
          Your coordinates must sum to ~100, but they sum to {sum}.
        </error>
      );
      return;
    }

    Object.values(BANNED).forEach((array) => (array.length = 0));

    await calculateAndDisplay({ target: coords, BANNED });
  });

  const BANNED = {};

  document.on('click', '[type]', async ({ target: el }) => {
    console.log(el.outerHTML);
    const { type, name } = el.attributes;

    console.log(type, name);

    BANNED[type] = BANNED[type] || [];
    BANNED[type].push(name);

    const coords = $('#coords')
      .value.split(',')
      .map((s) => s.trim())
      .map(Number);

    await calculateAndDisplay({ target: coords, BANNED });
  });
}

async function calculateAndDisplay({ target, BANNED }) {
  await showSpinner(true);

  $('#list-body').innerHTML = '';

  const srcs = Object.entries(sources)
    .filter(([key, val]) => {
      if (val.continent === null) return false;
      for (const [k, list] of Object.entries(BANNED)) {
        if (list.includes(val[k])) {
          console.log(`Removed ${key}`);
          return false;
        }
      }
      return true;
    })
    .map(([key, val]) => {
      return [key, ...val.PCAs];
    });

  if (srcs.length === 0) {
    showSpinner(false);
    Window.this.modal(
      <warning caption="Error">
        All sources deleted! Click "Calculate" to refresh.
      </warning>
    );

    Object.values(BANNED).forEach((array) => (array.length = 0));

    return;
  }

  const percentages = predictEthnicityPercentages(['you', ...target], srcs);

  const composition = Object.entries(percentages).filter(
    ([name, pct]) => pct !== 0
  );

  const { html: elements, userCountries } = updateEthnicityComposition(
    composition
  );

  for (const element of elements) {
    $('#list-body').innerHTML += element;
  }
  $$('#list-body > div').forEach(
    (div) => (div.attributes.title = 'Click to delete.')
  );

  const flagCSS = `url('${cwd().replace(
    /\\/g,
    '/'
  )}resources/images/png/flags/countries/512x512/${userCountries[0].countryName.replace(
    / /g,
    '-'
  )}.png')`;

  drawWheel(userCountries);

  showSpinner(false);
}

function updateEthnicityComposition(ethnicities) {
  const composition = ethnicities.reduce((comp, [name, percent]) => {
    const eth = sources[name];

    comp[eth.continent] = comp[eth.continent] || {
      percent: 0,
      children: {},
    };

    comp[eth.continent].percent += percent;

    if (eth.subcontinent) {
      comp[eth.continent].children[eth.subcontinent] = comp[eth.continent]
        .children[eth.subcontinent] || {
        percent: 0,
        children: {},
      };

      comp[eth.continent].children[eth.subcontinent].percent += percent;
    }

    if (eth.country) {
      comp[eth.continent].children[eth.subcontinent].children[
        eth.country
      ] = comp[eth.continent].children[eth.subcontinent].children[
        eth.country
      ] || {
        percent: 0,
        children: {},
      };

      comp[eth.continent].children[eth.subcontinent].children[
        eth.country
      ].percent += percent;
    }

    if (eth.country && eth.region) {
      comp[eth.continent].children[eth.subcontinent].children[
        eth.country
      ].children[eth.region] =
        comp[eth.continent].children[eth.subcontinent].children[eth.country]
          .children[eth.region] || 0;

      comp[eth.continent].children[eth.subcontinent].children[
        eth.country
      ].children[eth.region] += percent;
    }

    return comp;
  }, {});

  const html = [];

  const userCountries = [];

  for (const [
    continentName,
    { percent, children: subcontinents },
  ] of Object.entries(composition)) {
    html.push(
      `<div .continent .${continentName} type="continent" name="${continentName}"><div>${capitalize(
        continentName
      )}</div><div>${percent.toFixed(1)}%</div></div>`
    );
    for (const [
      subcontinentName,
      { percent, children: countries },
    ] of Object.entries(subcontinents)) {
      html.push(
        `<div .subcontinent .subcontinent-of-${continentName} type="subcontinent" name="${subcontinentName}"><div>${capitalize(
          subcontinentName
        )}</div><div>${percent.toFixed(1)}%</div></div>`
      );

      for (const [
        countryName,
        { percent, children: regions },
      ] of Object.entries(countries)) {
        userCountries.push({ countryName, percent });
        html.push(
          `<div .country style="--flag: url(${cwd().replace(
            /\\/g,
            '/'
          )}/resources/images/png/flags/countries/16x16/${countryName.replace(
            / /g,
            '-'
          )}.png)" type="country" name="${countryName}"><div>${capitalize(
            countryName
          )}</div><div>${percent.toFixed(1)}%</div></div>`
        );
        for (const [regionName, regionPercent] of Object.entries(regions)) {
          html.push(
            `<div .region type="region" name="${regionName}"><div>${capitalize(
              regionName
            )}</div><div>${regionPercent.toFixed(1)}%</div></div>`
          );
        }
      }
    }
  }

  return { html, userCountries };
}

function capitalize(string) {
  return string.replace(/(?<=\b)[a-z]/g, (char) => char.toUpperCase());
}

async function showSpinner(show = true) {
  if (show) {
    document.documentElement.body.classList.add('loading');
    await new Promise(setTimeout);
  } else {
    document.documentElement.body.classList.remove('loading');
  }
}
