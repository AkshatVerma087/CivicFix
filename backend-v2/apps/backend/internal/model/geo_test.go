package model_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/AkshatVerma087/go-civicfix/internal/model"
)

func TestConvertToGeoPoint(t *testing.T) {
	lat, lng := 28.6, 77.2

	got := (&model.LocationInput{Latitude: &lat, Longitude: &lng}).ConvertToGeoPoint()
	require.Equal(t, &model.GeoPoint{Latitude: 28.6, Longitude: 77.2}, got)

	require.Nil(t, (&model.LocationInput{Latitude: &lat}).ConvertToGeoPoint(), "missing longitude")

	var none *model.LocationInput
	require.Nil(t, none.ConvertToGeoPoint(), "nil input")
}
