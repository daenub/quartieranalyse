import { LitElement, css, html, nothing, unsafeCSS } from "lit";

import { MapboxOverlay as DeckOverlay } from "@deck.gl/mapbox";
import { MVTLayer } from "@deck.gl/geo-layers";
import { load } from "@loaders.gl/core";

import geojsonvt from "geojson-vt";
import vtpbf from "vt-pbf";

import maplibregl from "maplibre-gl";
import maplibreCSS from "maplibre-gl/dist/maplibre-gl.css?inline";

import "@statistikzh/leu/leu-spinner.js";

const ZONE_TYPES = [
  ["wohnzone_bis_W2", "Wohnzone W1/W2"],
  ["wohnene_ab_W3", "Wohnzonen W3 und höher"],
  ["mischzone", "Mischzone"],
  ["zone_fuer_oeffentliche_bauten", "Zone für öffentliche Bauten"],
  ["industriezone", "Industriezone"],
  ["keine_bauzone", "Keine Bauzone"],
];

/**
 * App container.
 */
export class ZhApp extends LitElement {
  static get properties() {
    return {
      _tileIndex: { state: true },
      _loading: { state: true },
      _activeObject: { state: true },
    };
  }

  constructor() {
    super();
    /** @type {MapboxOverlay} */
    this._deckOverlay;
    this._tileIndex;
    this._loading = true;
    this._activeObject = null;
  }

  firstUpdated() {
    const map = new maplibregl.Map({
      container: this.shadowRoot.querySelector("#map"),
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [8.75, 47.4],
      zoom: 10,
      bearing: 0,
    });

    const deckOverlay = new DeckOverlay({
      // interleaved: true,
      layers: [],
      onHover: this._handleHover,
    });

    map.addControl(deckOverlay);
    map.addControl(new maplibregl.NavigationControl());

    this._deckOverlay = deckOverlay;

    this._createTileIndex();
  }

  updated() {
    const layers = [
      this._tileIndex &&
        new MVTLayer({
          id: "neighbourhood",
          data: "{x}/{y}/{z}",
          fetch: this._mvtLayerFetch,
          opacity: 0.2,
          getFillColor: (f) => {
            return this._getFillColor(f.properties.einf);
          },
          pickable: true,
        }),
    ];

    this._deckOverlay.setProps({ layers });
  }

  async _createTileIndex() {
    const res = await fetch("./data.json");
    const data = await res.json();

    console.log(data.features[0]);

    this._loading = false;
    this._tileIndex = geojsonvt(data, {
      maxZoom: 23,
      buffer: 64,
      extent: 4096,
      tolerance: 10,
    });
  }

  _mvtLayerFetch = (url, { layer, loadOptions }) => {
    const [x, y, z] = url.split("/").map(Number);

    const tile = this._tileIndex.getTile(z, x, y);
    if (!tile) {
      return null;
    }
    var buff = vtpbf.fromGeojsonVt({ geojsonLayer: tile });

    return load(buff, layer.props.loaders, loadOptions);
  };

  _getFillColor(zone) {
    switch (zone) {
      case "wohnzone_bis_W2":
        return [238, 123, 28];
      case "wohnene_ab_W3":
        return [229, 61, 37];
      case "mischzone":
        return [155, 83, 181];
      case "zone_fuer_oeffentliche_bauten":
        return [67, 169, 98];
      case "industriezone":
        return [28, 160, 236];
      case "keine_bauzone":
        return [236, 236, 236];
      default:
        return [240, 240, 240];
    }
  }

  _handleHover = ({ object }) => {
    this._activeObject = object ? object.properties : null;
  };

  _renderActiveObject() {
    console.log("rendering active object", this._activeObject);
    if (!this._activeObject) {
      return nothing;
    }

    const keys = [
      ["u_region", "Region"],
      ["u_gemeinde", "Gemeinde"],
      ["u_einw", "Einwohner"],
      ["u_flaeche", "Fläche"],
    ];

    return html`
      <table class="info">
        ${keys.map((key) => {
          const value = this._activeObject[key[0]];
          return html` <tr>
            <td>${key[1]}</td>
            <td>${isNaN(value) ? value : value.toFixed(2)}</td>
          </tr>`;
        })}
      </table>
    `;
  }

  render() {
    return html`
      <div id="map" class="map"></div>
      <div class="panel">
        <h1 class="title">Quartieranalyse</h1>
        ${this._loading
          ? html`<div class="spinner-wrapper">
              <leu-spinner class="spinner"></leu-spinner>
            </div>`
          : nothing}
        <ul class="zone-legend">
          ${ZONE_TYPES.map(
            ([zone, label]) =>
              html`<li
                class="zone-legend__item"
                style="--_color: rgb(${this._getFillColor(zone).join(",")})"
              >
                ${label}
              </li>`
          )}
        </ul>
        ${this._renderActiveObject()}
      </div>
    `;
  }

  static get styles() {
    return [
      css`
        :host {
          display: block;
          width: 100vw;
          height: 100vh;
        }

        .map {
          width: 100%;
          height: 100%;
        }

        .panel {
          position: absolute;
          z-index: 10;
          top: 1rem;
          left: 1rem;
          background: var(--leu-color-black-0);
          padding: 1rem;
          border-radius: 0.25rem;
          box-shadow: var(--leu-box-shadow-short);
        }

        .title {
          margin: 0 0 1rem;
          font: var(--leu-t-curve-regular-black-font);
        }

        .spinner-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .zone-legend {
          list-style: none;
          padding: 0;
          margin: 0;
          font: var(--leu-t-tiny-regular-font);
          color: var(--leu-color-black-60);
        }

        .zone-legend__item {
          display: flex;
          gap: 0.5rem;
        }

        .zone-legend__item::before {
          content: "";
          width: 1em;
          height: 1em;
          display: inline-block;
          background-color: var(--_color);
          transform: translateY(2px);
        }

        .info {
          font: var(--leu-t-tiny-regular-font);
          color: var(--leu-color-black-60);
          margin-top: 1rem;
        }
      `,
      css`
        ${unsafeCSS(maplibreCSS)}
      `,
    ];
  }
}

window.customElements.define("zh-app", ZhApp);
