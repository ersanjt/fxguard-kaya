'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { describeCloudConfigGap } = require('../lib/cloudConfigGap');

test('Cloud verify names the missing field instead of a blanket not_configured', () => {
    assert.equal(describeCloudConfigGap(null).error, 'cloud_disabled');
    assert.equal(
        describeCloudConfigGap({
            cloudEnabled: false,
            cloudAccessToken: 'x'.repeat(20),
            cloudPhoneNumberId: '1',
        }).error,
        'cloud_disabled'
    );
    assert.equal(describeCloudConfigGap({ cloudEnabled: true }).error, 'not_configured');
    assert.equal(
        describeCloudConfigGap({ cloudEnabled: true, cloudPhoneNumberId: '1402' }).error,
        'missing_token'
    );
    assert.equal(
        describeCloudConfigGap({ cloudEnabled: true, cloudAccessToken: 'EAAG' + 'x'.repeat(20) })
            .error,
        'missing_phone'
    );
    assert.equal(
        describeCloudConfigGap({
            cloudEnabled: true,
            cloudAccessToken: 'EAAG' + 'x'.repeat(20),
            cloudPhoneNumberId: '1402168889654134',
        }),
        null
    );
});
