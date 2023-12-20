/**
 * RandomPointsFill.js
 *
 * A utility class for OpenLayers to generate and display semi-random points within polygonal features.
 * This class is designed to work with OpenLayers maps and provides functionality to fill polygon features
 * with points (can be a symbol) which are arranged on a grid and with a random shift.
 *
 * by mir
 * mir@almanaqueazulorg
 * v.1
 * 2023-1-19
 *
 * Method:
 *  - fillWithRandomPoints: Main method to generate and render random points within polygons.
 *
 * Usage:
 *  1. Initialize the RandomPointsFill class with the OpenLayers map instance, feature source, tree source, and point style.
 *  2. Call the fillWithRandomPoints method, typically as a response to polygon vector layer events such as 'postrender'.
 *
 * Example:
 *  const randomPointsFill = new RandomPointsFill(map, featureSource, treeSource, pointStyle);
 *  vectorLayer.on('postrender', (event) => randomPointsFill.fillWithRandomPoints(event));
 *
 * pointStyle is an array with various possible point styles.
 *
 * TODO: add filtering and density, randomness as a parameter
 */

import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import { toFeature } from "ol/render/Feature";
import { getArea as getExtentArea } from "ol/extent";

export class RandomPointsFill {
  constructor(map, featureSource, treeSource, pointStyle) {
    this.map = map;
    this.featureSource = featureSource;
    this.treeSource = treeSource;
    this.isForestUpdated = false;
    this.currentExtent = null;
    this.pointStyle = pointStyle;
  }

  fillWithRandomPoints(event) {
    console.log("entre");
    let i = 0;
    const extent = this.map.getView().calculateExtent(this.map.getSize());

    if (this.isForestUpdated) {
      if (JSON.stringify(extent) == JSON.stringify(this.currentExtent)) {
        return;
      } else {
        this.currentExtent = [...extent];

        this.isForestUpdated = false;
      }
    }
    try {
      let points;

      var features = this.featureSource.getFeaturesInExtent(extent);
      var resolution = this.map.getView().getResolution();
      var resolutionArea = resolution * resolution; // the area in meters of one pixel
      this.treeSource.clear(true);

      let style;
      let probability;
      let density;
      let randomness;
      let featureHashes = new Set();

      features.forEach((renderFeature) => {
        var polygon = toFeature(renderFeature);

        var poligonosBase = guessOuterRingsByxtent(polygon);

        poligonosBase.forEach((littlePolygon) => {
          if (!isThisADuplicateFeature(littlePolygon, featureHashes)) {
            var area = Math.abs(littlePolygon.getGeometry().getArea());

            var areaReal = area / resolutionArea;

            if (areaReal > 0.99) {
              switch (littlePolygon.values_.Class_name) {
                case "Bosque latifoliado mixto maduro":
                  style = 0;
                  probability = 0.8; // between 0 y 1
                  density = 30 * resolution;
                  randomness = 0.8; // usually between 0 y 1
                  break;

                case "Bosque de mangle":
                  style = 2;
                  probability = 1;
                  density = 16 * resolution;
                  randomness = 0.5;

                  break;

                default: // secondary and other forests
                  style = 1;
                  probability = 1;
                  density = 20 * resolution;
                  randomness = 1;
                  break;
              }

              points = generateSemiRandomPoints(
                extent,
                littlePolygon,
                density,
                randomness,
                probability,
                this.pointStyle[style]
              );

              this.treeSource.addFeatures(points);
            }
          }
          i++;
        });
      });
    } finally {
      if (i > 0) {
        this.isForestUpdated = true;
      }
    }
  }
}

function generateSemiRandomPoints(
  viewExtent,
  polygon,
  density,
  randomnessFactor,
  probability,
  style
) {
  const points = [];
  const polygonExtent = polygon.getGeometry().getExtent();
  const overlapExtent = [
    Math.max(viewExtent[0], polygonExtent[0]), // xmin
    Math.max(viewExtent[1], polygonExtent[1]), // ymin
    Math.min(viewExtent[2], polygonExtent[2]), // xmax
    Math.min(viewExtent[3], polygonExtent[3]), // ymax
  ];

  for (let x = overlapExtent[0]; x < overlapExtent[2]; x += density) {
    let isEvenRow = false;

    for (let y = overlapExtent[1]; y < overlapExtent[3]; y += density) {
      if (Math.random() <= probability) {
        let randomX = x;
        let randomY = y;

        if (randomnessFactor > 0) {
          randomX += getRandomShift(
            density,
            randomnessFactor,
            polygonExtent[0],
            polygonExtent[2]
          );
          randomY += getRandomShift(
            density,
            randomnessFactor,
            polygonExtent[1],
            polygonExtent[3]
          );

          if (isEvenRow) {
            randomX += density / 2;
          }
        }

        let point = new Point([randomX, randomY]);
        if (
          polygon.getGeometry().intersectsCoordinate(point.getCoordinates())
        ) {
          let pointFeature = new Feature(point);
          pointFeature.setStyle(style);
          points.push(pointFeature);
        }
      }
      isEvenRow = !isEvenRow;
    }
  }

  return points;
}

function guessOuterRingsByxtent(feature) {
  // RenderFeatures do not always have the outer ring as first ring
  // so here we make a rough guess taking the ring with the largest extent
  // see https://github.com/openlayers/openlayers/issues/15391
  const geometry = feature.getGeometry();
  const className = feature.get("Class_name");
  let rings;
  let outerRings = [];

  if (geometry.getType() === "Polygon") {
    rings = geometry.getLinearRings();
    outerRings = [findLargestRing(rings)];
  } else {
    geometry.getPolygons().forEach((polygon) => {
      rings = polygon.getLinearRings();
      const largestRing = findLargestRing(rings);
      largestRing.setProperties({ Class_name: className });

      outerRings.push(largestRing);
    });
  }

  return outerRings;
}

function findLargestRing(rings) {
  let largestRing = rings[0];

  rings.forEach((ring) => {
    if (
      getExtentArea(ring.getExtent()) > getExtentArea(largestRing.getExtent())
    ) {
      largestRing = ring;
    }
  });

  const coordinates = largestRing.getCoordinates();
  const largestRingFeature = new Feature({
    geometry: new Polygon([coordinates]),
  });

  return largestRingFeature;
}

function isThisADuplicateFeature(feature, featureHashes) {
  // lots of duplicates among RenderFeatures in an extent
  let geometriaFeature = feature.getGeometry().getFlatCoordinates();
  // Make a quickk guess if the first 4 coordinates are the same
  let coordsHash = JSON.stringify(geometriaFeature.slice(0, 4));

  if (featureHashes.has(coordsHash)) {
    return true;
  } else {
    featureHashes.add(coordsHash);
    return false;
  }
}

function getRandomShift(density, randomnessFactor, minExtent, maxExtent) {
  if (Math.abs(minExtent - maxExtent) > density) {
    return (
      -(density * randomnessFactor) / 2 +
      Math.random() * density * randomnessFactor
    );
  } else {
    return (
      -(density * randomnessFactor) / 4 +
      (Math.random() * (density * randomnessFactor)) / 2
    );
  }
}
