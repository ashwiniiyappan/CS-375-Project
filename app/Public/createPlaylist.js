      function createPlaylist() {
      var playlistTitle = prompt("Enter playlist title:");

      if (playlistTitle !== null) {
      // If the user didn't cancel the prompt, send the title to the server
      fetch('/create_playlist', {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playlistTitle: playlistTitle }),
      })
      .then(response => response.json())
      .then(data => {
      // Handle the response as needed
      console.log('Playlist created:', data);
      // You might want to update the page or show a success message here
      })
      .catch(error => {
      console.error('Error creating playlist:', error);
      // Handle the error
      });
      }
      }