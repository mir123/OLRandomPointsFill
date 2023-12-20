# OLRandomPointsFill

Fill polygons in OpenLayers using random point features

 A utility class for OpenLayers to generate and display semi-random points within polygonal features.
 This class is designed to work with OpenLayers maps and provides functionality to fill polygon features
 with points (can be a symbol) which are arranged on a grid and with a random shift.
 
 Method:
  - `fillWithRandomPoints`: Main method to generate and render random points within polygons.
 
 Usage:
 1. Import the class:

    import { RandomPointsFill } from "./RandomPointsFill.js";

  2. Create styles for your fill and put them in an array, i.e.

```

const iconoBosquePrimario = new Style({
  image: new Icon({
    src: "./data/iconos/arbol.svg",
    scale: 0.018,
  }),
});

const iconoBosque = new Style({
  image: new Icon({
    src: "./data/iconos/arbol.svg",
    scale: 0.012,
  }),
});

const iconoManglar = new Style({
  image: new Icon({
    src: "./data/iconos/manglar.svg",
    scale: 0.05,
  }),
});

const estiloBosques = [iconoBosquePrimario, iconoBosque, iconoManglar];

```    

  4. Add your polygon (PMTiles) and point fill layers. You may want to make your polygons transparent.
```
const fuenteCobertura = new PMTilesVectorSource({
  url: "./data/cobertura.pmtiles",
});

const capaCobertura = new VectorTile({

  source: fuenteCobertura,
  visible: true,
  style: new Style({
    stroke: new Stroke({
      color: "#00000000",
      width: 0,
    }),
    fill: new Fill({
      color: "#00000000",
    }),
  }),

});

const fuenteArbolitos = new VectorSource();

const capaArbolitos = new VectorLayer({
  source: fuenteArbolitos,
});

```
  5. Initialize the RandomPointsFill class with the OpenLayers map instance, feature source (thhe polygons you want to fill), the fill source (a vector source), and point style.
```
const arbolitos = new RandomPointsFill(
  mapa,
  fuenteCobertura,
  fuenteArbolitos,
  estiloBosques
);
```
  2. Call the fillWithRandomPoints method, typically as a response to polygon vector layer events such as 'postrender'.
 
 ```
  const randomPointsFill = new RandomPointsFill(mapa, fuenteCobertura, fuenteArbolitos, estiloBosques);
  fuenteCobertura.on('postrender', (event) => randomPointsFill.fillWithRandomPoints(event));
 ```
 `pointStyle` is an array with various possible point styles.
 
 TODO: currently filtering and classification is hardcoded, add filtering and density, randomness as a parameter when calling the class
