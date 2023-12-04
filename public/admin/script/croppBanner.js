var bs_modal = $('#modal');
var image = document.getElementById('image');
var cropper, reader, file;
var bannerImage = document.getElementById('imageName')


$("body").on("change", "#bannerImg", function (e) {
  console.log("Image 1 :",image)
  var files = e.target.files;

  bannerImage.value = files[0].name
  console.log("Files : ",files)
  if (files && files.length > 0) {
    let file = files[0];

    if (file.type.startsWith('image/')) {
      var done = function (url) {
        image.src = url;
        $('#bannerUrl').attr('value',image.src)
        console.log("IMAGE SRC :", image)
        bs_modal.modal('show');
      };

      if (URL) {
        done(URL.createObjectURL(file));
      } else if (FileReader) {
        var reader = new FileReader();
        reader.onload = function (e) {
          done(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } else {
      error.innerHTML = 'Please select a valid image file (e.g., JPG, PNG).';
    }
  }
});




bs_modal.on('shown.bs.modal', function () {
  cropper = new Cropper(image, {
    aspectRatio: 100 / 20,
    viewMode: 0,
    autoCrop: true,
    preview: '.preview',
    quality:1
  });
  console.log("Image 2 :",image)
}).on('hidden.bs.modal', function () {
  cropper.destroy();
  cropper = null;
});

$("#crop").click(function () {
  canvas = cropper.getCroppedCanvas({
    width: 1000,
    height: 400,
  });

  canvas.toBlob(function (blob) {
    url = URL.createObjectURL(blob);
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
      base64data = reader.result;

      bs_modal.modal('hide');

      // Display the cropped image in the <img> tag
      $('#croppedImg').attr('class','d-block')
      $('#croppedImg').attr('src', base64data);
      $('#bannerImg').attr('value', base64data)
      
      var formData = new FormData();
      formData.append("bannerImg", blob);
      console.log("form data : ",formData)
      fetch('/admin/uploadBannerImage', {
        method: 'POST',
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          // Handle the server's response here
          console.log(data);
        })
        .catch(error => {
          console.log('Error:', error);
        });
    };
  });
}); 


