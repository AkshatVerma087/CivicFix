package handler

import (
	"testing"

	"github.com/stretchr/testify/require"
)

type fakeReq struct{ Name string }

func (r *fakeReq) Validate() error { return nil }

func TestNewRequestReturnsFreshInstance(t *testing.T) {
	proto := &fakeReq{Name: "left over from an earlier request"}

	a := newRequest(proto)
	b := newRequest(proto)

	require.NotSame(t, proto, a)
	require.NotSame(t, a, b)
	require.Empty(t, a.Name, "must not carry data from the prototype")

	a.Name = "request A"
	require.Empty(t, b.Name, "requests must not share state")
}
