package model

// =============================================================
// GeoPoint
// =============================================================

// GeoPoint is a location with both coordinates set.
type GeoPoint struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// =============================================================
// LocationInput
// =============================================================

// LocationInput is a client-sent location. Pointers: 0 is valid, missing is not.
type LocationInput struct {
	Latitude  *float64 `json:"latitude" validate:"required,gte=-90,lte=90"`
	Longitude *float64 `json:"longitude" validate:"required,gte=-180,lte=180"`
}

// ConvertToGeoPoint returns a GeoPoint, or nil if a coordinate is missing.
func (l *LocationInput) ConvertToGeoPoint() *GeoPoint {
	if l == nil || l.Latitude == nil || l.Longitude == nil {
		return nil
	}

	return &GeoPoint{
		Latitude:  *l.Latitude,
		Longitude: *l.Longitude,
	}
}
