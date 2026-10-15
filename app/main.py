"""
FastAPI Parametric Engine for Bamboo CAD Bridge.
Provides backend calculations for bamboo culms and joint geometry.
No subprocess.run is used. No shell calls are made.
"""

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, ValidationInfo
from typing import List
import math

app = FastAPI(
    title="Bamboo Structural CAD API",
    description="Local container backend providing parametric bamboo geometry processing.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CulmSpec(BaseModel):
    """
    Parametric specification model for bamboo culms.
    Uses Pydantic v2 validation rules and field coercions.
    """
    culm_id: str = Field(..., description="Unique label for the bamboo member")
    length_m: float = Field(3.0, gt=0, description="Total length of the culm in meters")
    basal_diameter_m: float = Field(0.12, gt=0, description="Outer diameter at base in meters")
    top_diameter_m: float = Field(0.10, gt=0, description="Outer diameter at top in meters")
    wall_thickness_m: float = Field(0.015, gt=0, description="Wall thickness in meters")
    node_spacing_m: float = Field(0.28, gt=0, description="Distance between nodes in meters")

    @field_validator('top_diameter_m')
    @classmethod
    def validate_taper(cls, v: float, info: ValidationInfo) -> float:
        """
        Validates that the top diameter does not exceed the base diameter.
        """
        if 'basal_diameter_m' in info.data and v > info.data['basal_diameter_m']:
            raise ValueError('Top diameter cannot exceed basal diameter.')
        return v

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Heartbeat endpoint for frontend polling."""
    return {"status": "online", "mode": "docker_backend_active", "engine": "FastAPI/Pydantic-v2"}

@app.post("/api/generate-spec", status_code=status.HTTP_200_OK)
def generate_spec(culms: List[CulmSpec]):
    """
    Computes node positions along Z-axis, wall-thickness ratios,
    and structural validity checks based on ECHO Technical Note #92 specifications.
    """
    processed = []
    for culm in culms:
        num_nodes = int(culm.length_m / culm.node_spacing_m)
        node_positions = [round(i * culm.node_spacing_m, 3) for i in range(1, num_nodes)]

        basal_radius = culm.basal_diameter_m / 2.0
        wall_ratio = (culm.wall_thickness_m / basal_radius) * 100.0

        processed.append({
            "culm_id": culm.culm_id,
            "length_m": culm.length_m,
            "basal_diameter_m": culm.basal_diameter_m,
            "top_diameter_m": culm.top_diameter_m,
            "wall_thickness_m": culm.wall_thickness_m,
            "node_count": num_nodes,
            "node_positions_m": node_positions,
            "wall_ratio_percentage": round(wall_ratio, 2),
            "structural_validity": "VALID" if wall_ratio >= 15.0 else "WARNING_WALL_TOO_THIN"
        })

    return {
        "status": "success",
        "processed_count": len(processed),
        "results": processed
    }
