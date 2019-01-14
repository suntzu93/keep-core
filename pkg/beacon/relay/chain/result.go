package chain

import (
	"bytes"
	"math/big"
)

// DKGResult is a result of distributed key generation protocol.
//
// Success means that the protocol execution finished with acceptable number of
// disqualified or inactive members. The group of remaining members should be
// added to the signing groups for the threshold relay.
//
// Failure means that the group creation could not finish, due to either the number
// of inactive or disqualified participants, or the presented results being
// disputed in a way where the correct outcome cannot be ascertained.
type DKGResult struct {
	// Result type of the protocol execution. True if success, false if failure.
	Success bool
	// Group public key generated by protocol execution, nil if the protocol failed.
	GroupPublicKey []byte
	// Disqualified members. Length of the slice and order of members are the same
	// as in the members group. Disqualified members are marked as true. It is
	// kept in this form as an optimization for an on-chain storage.
	Disqualified []bool
	// Inactive members. Length of the slice and order of members are the same
	// as in the members group. Disqualified members are marked as true. It is
	// kept in this form as an optimization for an on-chain storage.
	Inactive []bool
}

// Equals checks if two DKG results are equal.
func (r1 *DKGResult) Equals(r2 *DKGResult) bool {
	if r1 == nil || r2 == nil {
		return r1 == r2
	}
	if r1.Success != r2.Success {
		return false
	}
	if !bytes.Equal(r1.GroupPublicKey, r2.GroupPublicKey) {
		return false
	}
	if !boolSlicesEqual(r1.Disqualified, r2.Disqualified) {
		return false
	}
	if !boolSlicesEqual(r1.Inactive, r2.Inactive) {
		return false
	}
	return true
}

// PublicKeyAsBytes returns public key in the same format as stored on-chain.
//
// TODO: Instead of transforming PKey here, change type of GroupPublicKey field.
func (dkgr *DKGResult) PublicKeyAsByteArray() [32]byte {
	var arr [32]byte
	copy(arr[:], dkgr.GroupPublicKey[:32])
	return arr
}

// DisqualifiedAsBytes returns DQ array in the same format as stored on-chain.
//
// TODO: Instead of transforming DQ here, change type of Disqualified field.
func (dkgr *DKGResult) DisqualifiedAsBytes() []byte {
	disqualified := make([]byte, len(dkgr.Disqualified))
	for i, dq := range dkgr.Disqualified {
		if dq {
			disqualified[i] = 0x01
		} else {
			disqualified[i] = 0x00
		}
	}
	return disqualified
}

// InactiveAsBytes returns IA array in the same format as stored on-chain.
//
// TODO: Instead of transforming IA here, change type of Inactive field.
func (dkgr *DKGResult) InactiveAsBytes() []byte {
	inactive := make([]byte, len(dkgr.Inactive))
	for i, ia := range dkgr.Inactive {
		if ia {
			inactive[i] = 0x01
		} else {
			inactive[i] = 0x00
		}
	}
	return inactive
}

// bigIntEquals checks if two big.Int values are equal.
func bigIntEquals(expected *big.Int, actual *big.Int) bool {
	if expected != nil && actual != nil {
		return expected.Cmp(actual) == 0
	}
	return expected == nil && actual == nil
}

// boolSlicesEqual checks if two slices of bool are equal. Slices need to have
// the same length and have the same order of entries.
func boolSlicesEqual(expectedSlice []bool, actualSlice []bool) bool {
	if len(expectedSlice) != len(actualSlice) {
		return false
	}
	for i := range expectedSlice {
		if expectedSlice[i] != actualSlice[i] {
			return false
		}
	}
	return true
}
