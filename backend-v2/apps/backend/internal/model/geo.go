package model

type GeoPoint struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type LocationInput struct {
	Latitude  *float64 `json:"latitude" validate:"required,gte=-90,lte=90"`
	Longitude *float64 `json:"longitude" validate:"required,gte=-180,lte=180"`
}

func (l *LocationInput) ConvertToGeoPoint() *GeoPoint {
	if l == nil || l.Latitude == nil || l.Longitude == nil {
		return nil
	}

	return &GeoPoint{
		Latitude:  *l.Latitude,
		Longitude: *l.Latitude,
	}
}
