# The Long Road to a Doctor

*In Belarus, 428,000 people live in settlements located more than an hour’s walk from the nearest medical facility.*

Read the full story here: [The Long Road to a Doctor](https://by-ali.github.io/healthcare_access/)

## What I aimed to accomplish

I aimed to measure how far people across Belarus live from the nearest medical facility, identify the areas where access is most limited, and show how these gaps are concentrated in small rural communities and overlap with older populations and lower average wages.

## Key findings

I found that 428,130 people — 4.63% of the population covered by the analysis — live more than an hour’s walk from the nearest medical facility.

More than half of the settlements analyzed fall beyond this threshold. The problem is especially visible in small villages and in the Vitebsk Region.

## Data collection

### 1. A first attempt that did not work

My first attempt took a full week of work. 😭

- I scraped [Talon.by](https://talon.by/), a website used to book medical appointments online. It listed about 1,480 institutions.
- After removing facilities that did not provide primary care, including cosmetic clinics, private medical centers and laboratories, only several hundred institutions remained.
- I tried to expand the dataset with data from [OpenStreetMap](https://www.openstreetmap.org/). However, the records were inconsistent. Some were not medical facilities, and many did not have clear names, which made duplicate removal difficult.
- I therefore used OpenStreetMap only to collect feldsher-midwife stations, or FAPs — basic rural health posts.
- When I first calculated distances, some settlements appeared to be up to 80 kilometers from the nearest medical facility. This seemed unrealistic for Belarus.
- I tried to improve the data by searching Google for the nearest hospitals. However, the results sometimes included unrelated businesses, such as tire repair shops, and did not always identify the closest medical facility. This did not significantly improve the results.

It became clear that I could not draw conclusions from this dataset, so I continued looking for a better source. This was difficult because public data in Belarus is limited.

### 2. Finding a better source

After extensive research, I found [Healthcare.by](https://www.healthcare.by/), which appeared to be the most complete available directory of medical institutions in Belarus.

I scraped data on:

- hospitals;
- polyclinics;
- feldsher-midwife stations;
- outpatient clinics.

The final dataset included more than 3,000 medical facilities.

### 3. Geocoding

Geocoding created another major challenge.

I first geocoded the medical facilities with Google. When I checked the results on a map, many points were in the wrong locations. Some appeared in Russia, while others were placed in the wrong part of Belarus.

Most errors involved small towns and villages. Manual checks showed that many of them were missing from Google Maps.

Further research suggested that Yandex Maps had better coverage of Belarus. Yandex also provides a geocoding API, but the free limit was 1,000 requests per day, while my dataset contained more than 3,000 facilities. The paid API was too expensive for this project.

I therefore geocoded the data in smaller batches. I started with FAPs because they are usually located in small villages and were the most likely to be incorrectly geocoded.

I re-geocoded about 2,700 facilities in random batches of 500. The request counter updated slowly, which allowed me to process more records than the daily limit. Eventually, Yandex blocked me. 😅

### 4. Administrative boundaries

I downloaded OpenStreetMap administrative boundaries for the regions and districts of Belarus.

Using GeoPandas, I assigned each medical facility to its corresponding district and region.

### 5. Settlements

I downloaded the [HOTOSM Belarus Populated Places](https://data.humdata.org/dataset/hotosm_blr_populated_places) GeoPackage from the Humanitarian Data Exchange.

I cleaned the dataset by:

- removing polygons and lines;
- keeping only point geometries;
- cleaning settlement names;
- removing settlements located outside Belarus.

## Data analysis

### 1. Finding the nearest medical facility

I used `gpd.sjoin_nearest` in GeoPandas to identify the nearest medical facility to each settlement by straight-line distance.

### 2. Identifying remote settlements

I used `.nlargest()` to identify the most remote settlements and manually checked the settlements at the top of the list.

I calculated the share of settlements located more than:

- 3 kilometers;
- 8 kilometers;
- 13 kilometers

from the nearest medical facility.

I analyzed the results by district and region to identify geographic patterns.

### 3. Adding demographic and salary data

I added official statistics from [Belstat](https://www.belstat.gov.by/) on:

- the population aged 65 and older in each district and region;
- average wages by administrative area.

I joined these figures with the medical-access data.

The merge was difficult because OpenStreetMap and Belstat used different Latin transliterations for Belarusian district and region names. I used `process` and `fuzz` from the RapidFuzz library to match the records.

### 4. Walking-time analysis in QGIS

I classified settlements according to whether they were within one hour’s walk of a medical facility or farther away.

The analysis included the following steps:

- Reprojected the road network, medical facilities and settlement points to `EPSG:3035`, so distances were measured in metres rather than degrees.
- Filtered the OpenStreetMap road network to keep roads suitable for walking and removed motorways, construction roads and other unsuitable features.
- Ran **Service area (from layer)** in QGIS, using:
  - medical facilities as starting points;
  - the pedestrian road network as the network layer;
  - **Fastest** as the path type;
  - a travel cost of one hour;
  - a walking speed of 4 km/h;
  - travel in both directions.
- Converted the reachable road segments into one-hour accessibility polygons.
- Used **Extract by location** to classify settlements:
  - points intersecting the polygons were treated as being within one hour’s walk;
  - points outside the polygons were classified as more than one hour away.

I also calculated the share of the population living in each group.

## Visualization

### 1. Map data

I used GeoJSON files for the interactive map.

#### Data prepared in Jupyter Notebook

I prepared several datasets in Jupyter Notebook:

- the share of residents aged 65 and older by district;
- the relationship between the share of older residents and settlements more than 60 minutes from medical care;
- the 20 settlements farthest from medical facilities, their nearest facilities and the distance between them.

Most of the 20 most remote settlements were in the Vitebsk Region.

#### Data prepared in QGIS

I prepared:

- a hexagon map showing the percentage of settlements located more than 60 minutes from a medical facility;
- settlement points located more than 60 minutes away, linked to population data;
- regional boundaries aligned with the hexagon layer.

The hexagons group nearby settlements into equal-sized areas. This reduces overlapping points and makes geographic patterns easier to compare. For each hexagon, I calculated the share of settlements located more than 60 minutes from medical care.

These datasets were added as layers in Mapbox.

### 2. Charts

I created two charts:

- a scatter plot comparing each district’s average monthly gross wage in 2025 with the share of settlements located more than eight kilometers from the nearest medical facility;
- a two-point slope chart showing how the number of hospital institutions changed in each region between 2016 and 2025. Nationally, the total fell from 636 to 548 — a decline of 88.

### 3. Webpage

The webpage uses Mapbox GL JS to display and animate the maps as readers scroll through the story.

Standard HTML, CSS and JavaScript control the page structure, design and transitions between map scenes.

Flourish visualizations are embedded separately for the charts. GitHub Pages hosts the finished project as a static website.

## What I learned

This was a difficult project, but I learned a great deal.

### 1. Choosing data sources

The main lesson was to examine possible data sources carefully before starting the analysis.

A poor source can lead to days of scraping, cleaning and analysis that later need to be repeated. At the same time, it is sometimes impossible to understand the quality of a dataset until it has been scraped, cleaned and tested.

Next time, I would spend more time comparing possible sources and discussing them with colleagues before beginning the main analysis.

### 2. QGIS

I gained extensive experience with QGIS.

I had previously found the program intimidating, but I became much more comfortable using it during this project.

I also learned that different geospatial tasks require different coordinate reference systems. Some projections use degrees, while others use meters.

### 3. Mapbox

This was my first project using Mapbox.

I spent a great deal of time testing layers, transitions and visual approaches — enough to use all of my monthly Mapbox credits.

### 4. Web scraping

I practiced scraping websites with Beautiful Soup.

### 5. GeoPandas

I learned how to use GeoPandas for spatial joins and other geospatial operations.

### 6. OpenStreetMap

I became familiar with OpenStreetMap data, its structure and its limitations.

### 7. RapidFuzz

I used `process` and `fuzz` from RapidFuzz to clean and match records when regular expressions or simple text replacement were not enough.

### 8. Geocoding in Belarus

I gained practical experience geocoding small towns and villages in Belarus.

Google did not work well for many small settlements. Yandex produced much better results.

### 9. New chart types

I created a scatter plot and a slope chart for the first time.

### 10. Web development

I initially created the webpage with the help of AI. I then edited and rebuilt parts of it myself.

Through this process, I became more familiar with JavaScript and with integrating Mapbox into a webpage.

## What I would improve with more time

- I would spend more time exploring the data and testing different calculations in QGIS.
- I would look for more local residents, experts and additional context, and spend more time developing the written story.
- My Jupyter notebooks became very messy during the analysis. I would like to develop a cleaner workflow so that I do not need to spend hours reorganizing them at the end.