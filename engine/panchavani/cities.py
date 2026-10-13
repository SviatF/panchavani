"""City-centre research coordinates. NOT yet authoritative gazetteer records.

Each coordinate requires an independently reviewed source, altitude/horizon
convention, and audit record before it may be used in a public release.
"""
from dataclasses import dataclass
from zoneinfo import ZoneInfo


@dataclass(frozen=True)
class City:
    id: str
    name: str
    latitude: float
    longitude: float
    elevation_m: float
    timezone: str = "Asia/Kolkata"
    coordinates_verified: bool = False
    coordinate_source: str = "approximate-city-centre-research-only"

    def __post_init__(self):
        if not -90 <= self.latitude <= 90 or not -180 <= self.longitude <= 180:
            raise ValueError("Invalid coordinates")
        ZoneInfo(self.timezone)


PILOT_CITIES = {
    c.id: c for c in [
        City("delhi", "Delhi", 28.6139, 77.2090, 216),
        City("mumbai", "Mumbai", 19.0760, 72.8777, 14),
        City("kolkata", "Kolkata", 22.5726, 88.3639, 9),
        City("chennai", "Chennai", 13.0827, 80.2707, 6),
        City("bengaluru", "Bengaluru", 12.9716, 77.5946, 920),
        City("ahmedabad", "Ahmedabad", 23.0225, 72.5714, 53),
        City("pune", "Pune", 18.5204, 73.8567, 560),
        City("varanasi", "Varanasi", 25.3176, 82.9739, 80),
    ]
}
