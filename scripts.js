function onSignIn(googleToken) {
  // Google has approved the sign-in, pass the token into our web app
  credentialExchange(googleToken);
}

function credentialExchange(googleToken) {
  // Create a decoded version of the token so we can print details
  console.log("Creating decoded token...");
  const googleTokenDecoded = parseJwt(googleToken.credential);
  
  // Output some details onto the browser console to show the token is working
  console.log("ID: " + googleTokenDecoded.sub);
  console.log('Full Name: ' + googleTokenDecoded.name);
  console.log("Email: " + googleTokenDecoded.email);
  
  if (googleTokenDecoded['sub']) {
    // Exchange the Google token for AWS credentials using Cognito
    console.log("Exchanging Google Token for AWS credentials...");
    AWS.config.region = 'us-east-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:488f8eb1-21ad-477e-8d9f-25a65845cd08', // Replace with your Identity Pool ID
      Logins: {
        'accounts.google.com': googleToken.credential
      }
    });

    // Get the credentials
    AWS.config.credentials.get(function(err) {
      if (!err) {
        console.log('Exchanged to Cognito Identity Id: ' + AWS.config.credentials.identityId);
        // Credentials are available, now call a function to access images
        accessImages();
      } else {
        // Show error message if there's an issue
        document.getElementById('output').innerHTML = "<b>YOU ARE NOT AUTHORISED TO QUERY AWS!</b>";
        console.log('ERROR: ' + err);
      }
    });
  } else {
    console.log('User not logged in!');
    document.getElementById('output').innerHTML = "<b>Authentication failed, please try again.</b>";
  }
}

function accessImages() {
  // Using the temporary AWS Credentials, connect to S3
  console.log("Creating Session to S3...");
  var s3 = new AWS.S3();
  var params = {
    Bucket: "image-gallery-files-private" // Replace with your S3 bucket name
  };

  // List all objects in the S3 bucket
  s3.listObjects(params, function(err, data) {
    console.log("Listing objects in the private bucket...");
    if (err) {
      document.getElementById('output').innerHTML = "<b>YOU ARE NOT AUTHORISED TO QUERY AWS!</b>";
      console.log(err, err.stack);
    } else {
      console.log('AWS response:', data);
      var href = this.request.httpRequest.endpoint.href;
      var bucketUrl = href + data.Name + '/';

      // Generate signed URLs for each image in the bucket
      var photos = data.Contents.map(function(photo) {
        var photoKey = photo.Key;

        console.log("Generating signedURL for: " + photoKey);
        var url = s3.getSignedUrl('getObject', {
          Bucket: data.Name,
          Key: photoKey
        });

        return getHtml([
          '<span>',
            '<div>',
              '<br/>',
              `<a href="${url}" target="_blank"><img style="width:224px;height:224px;border-radius:8px;" src="${url}" alt="Image" /></a>`,
            '</div>',
          '</span>',
        ]);
      });

      // Create and display HTML for the images
      var htmlTemplate = ['<div>', getHtml(photos), '</div>'];
      console.log("Creating and returning HTML...");
      document.getElementById('viewer').innerHTML = getHtml(htmlTemplate);
    }
  });
}

// A utility function to create HTML content
function getHtml(template) {
  return template.join('\n');
}

// A utility function to decode the Google token
function parseJwt(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace('-', '+').replace('_', '/');
  var plain_token = JSON.parse(window.atob(base64));
  return plain_token;
};
