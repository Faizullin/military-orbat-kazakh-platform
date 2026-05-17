<template>
  <div class="app-container">
    <div class="sidebar" v-if="selectedMarker">
      <h3>Edit Marker</h3>
      
      <div class="form-group">
        <label>Label Text</label>
        <button @click="startInlineEdit">Edit Inline</button>
      </div>

      <div class="form-group">
        <label>Color</label>
        <input type="color" v-model="selectedMarker.color" @input="updateFeatureStyle" />
      </div>

      <div class="form-group">
        <label>Shape Rotation (deg)</label>
        <input type="range" min="0" max="360" v-model.number="selectedMarker.rotation" @input="updateFeatureStyle" />
        <span>{{ selectedMarker.rotation }}°</span>
      </div>

      <button @click="deselect" class="deselect-btn">Deselect</button>
    </div>
    <div class="sidebar" v-else>
      <h3>Editor Mode</h3>
      <p>Click a flag on the map to select it and edit its properties.</p>
      <p>Click and drag a flag to move it.</p>
    </div>

    <div ref="mapContainer" class="map-container"></div>
    
    <!-- Inline Editor Overlay -->
    <div ref="inlineEditorContainer" class="inline-editor-container" v-show="isEditingInline">
      <input 
        ref="inlineInput"
        type="text" 
        v-model="inlineText" 
        @keyup.enter="finishInlineEdit"
        @blur="finishInlineEdit"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, shallowRef, nextTick } from 'vue';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Overlay from 'ol/Overlay';
import { Select, Translate } from 'ol/interaction';
import { Style, Icon, Text, Fill, Stroke } from 'ol/style';

const mapContainer = ref(null);
const inlineEditorContainer = ref(null);
const inlineInput = ref(null);

const map = shallowRef(null);
const vectorSource = shallowRef(null);
const overlay = shallowRef(null);
const selectInteraction = shallowRef(null);

// Application State
const markers = ref([
  { id: 'm1', type: 'flag', src: '/flag.svg', coordinate: [-1500000, 0], color: '#ffffff', text: 'Base Camp', rotation: 0, scale: 1, anchor: [10, 44] },
  { id: 'm2', type: 'flag2', src: '/flag2.svg', coordinate: [1500000, 0], color: '#ffffff', text: 'Team Alpha', rotation: 0, scale: 48 / 600, anchor: [127, 600] }
]);

const selectedMarker = ref(null);
const selectedFeature = ref(null);

const isEditingInline = ref(false);
const inlineText = ref('');

// Helper to find a marker by ID
const getMarkerById = (id) => markers.value.find(m => m.id === id);

// Style generator
const createMarkerStyle = (marker) => {
  return new Style({
    image: new Icon({
      src: marker.src,
      color: marker.color,
      anchor: marker.anchor,
      anchorXUnits: 'pixels',
      anchorYUnits: 'pixels',
      scale: marker.scale,
      rotation: (marker.rotation * Math.PI) / 180, // Convert to radians
    }),
    text: new Text({
      text: marker.text,
      offsetY: 15,
      fill: new Fill({ color: '#fff' }),
      stroke: new Stroke({ color: '#000', width: 3 }),
      font: 'bold 14px Inter, sans-serif'
    })
  });
};

const updateFeatureStyle = () => {
  if (selectedFeature.value && selectedMarker.value) {
    selectedFeature.value.setStyle(createMarkerStyle(selectedMarker.value));
  }
};

const deselect = () => {
  selectedMarker.value = null;
  selectedFeature.value = null;
  if (selectInteraction.value) {
    selectInteraction.value.getFeatures().clear();
  }
  isEditingInline.value = false;
  overlay.value.setPosition(undefined);
};

const startInlineEdit = async () => {
  if (!selectedMarker.value) return;
  isEditingInline.value = true;
  inlineText.value = selectedMarker.value.text;
  
  // Position overlay
  overlay.value.setPosition(selectedMarker.value.coordinate);
  
  await nextTick();
  inlineInput.value.focus();
};

const finishInlineEdit = () => {
  if (!isEditingInline.value) return;
  
  isEditingInline.value = false;
  if (selectedMarker.value) {
    selectedMarker.value.text = inlineText.value;
    updateFeatureStyle();
  }
  overlay.value.setPosition(undefined);
};

onMounted(() => {
  // Initialize features
  const features = markers.value.map(marker => {
    const feature = new Feature({
      geometry: new Point(marker.coordinate),
      markerId: marker.id, // attach ID to feature for back-reference
    });
    feature.setStyle(createMarkerStyle(marker));
    return feature;
  });

  vectorSource.value = new VectorSource({ features });

  const vectorLayer = new VectorLayer({
    source: vectorSource.value,
  });

  map.value = new Map({
    target: mapContainer.value,
    layers: [
      new TileLayer({ source: new OSM() }),
      vectorLayer,
    ],
    view: new View({
      center: [0, 0],
      zoom: 2,
    }),
  });

  // Setup Overlay
  overlay.value = new Overlay({
    element: inlineEditorContainer.value,
    positioning: 'top-center',
    offset: [0, 15], // offset to place it where the text normally is
    stopEvent: true,
  });
  map.value.addOverlay(overlay.value);

  // Setup Interactions
  selectInteraction.value = new Select();
  map.value.addInteraction(selectInteraction.value);

  selectInteraction.value.on('select', (e) => {
    if (e.selected.length > 0) {
      const feature = e.selected[0];
      selectedFeature.value = feature;
      selectedMarker.value = getMarkerById(feature.get('markerId'));
    } else {
      deselect();
    }
  });

  const translateInteraction = new Translate({
    features: selectInteraction.value.getFeatures(),
  });
  map.value.addInteraction(translateInteraction);

  translateInteraction.on('translateend', (e) => {
    if (e.features.getLength() > 0) {
      const feature = e.features.item(0);
      const markerId = feature.get('markerId');
      const marker = getMarkerById(markerId);
      if (marker) {
        marker.coordinate = feature.getGeometry().getCoordinates();
        // If inline editing, update overlay position
        if (isEditingInline.value && selectedMarker.value?.id === markerId) {
          overlay.value.setPosition(marker.coordinate);
        }
      }
    }
  });
});
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  font-family: 'Inter', sans-serif;
  background-color: #121212;
  color: white;
}

.sidebar {
  width: 300px;
  background-color: #1e1e1e;
  padding: 1.5rem;
  box-shadow: 4px 0 6px rgba(0,0,0,0.3);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar h3 {
  margin: 0;
  border-bottom: 1px solid #333;
  padding-bottom: 0.5rem;
}

.sidebar p {
  color: #ccc;
  line-height: 1.5;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.9rem;
  color: #aaa;
}

input[type="color"] {
  width: 100%;
  height: 40px;
  padding: 0;
  border: none;
  cursor: pointer;
}

input[type="range"] {
  width: 100%;
}

button {
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  font-weight: bold;
}
button:hover {
  background-color: #2563eb;
}

.deselect-btn {
  background-color: #ef4444;
  margin-top: auto;
}
.deselect-btn:hover {
  background-color: #dc2626;
}

.map-container {
  flex: 1;
  height: 100%;
}

.inline-editor-container input {
  padding: 4px 8px;
  font-size: 14px;
  font-weight: bold;
  border: 2px solid #3b82f6;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  outline: none;
}
</style>
