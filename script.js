
document.addEventListener("DOMContentLoaded", () => {
  console.log("Quagga carregado?", typeof Quagga); // deve mostrar "object"

  const allergenList = {
    "Bálsamo do Peru": [
      "bálsamo do peru","balsamo do peru","myroxylon pereirae","óleo-balsamo","bálsamo-de-tolu",
      "pau-bálsamo","bálsamo-índico-seco","bálsamo-de-cartagena","resina-de-tolu","bálsamo-toluano",
      "bálsamo-da-américa","bálsamo-de-cheiro-eterno","benjoim-do-norte","opobálsamo","óleo-vermelho",
      "coroiba","resina-de-tabu", "Natural flavour", "Vanilla", "Baunilha", "Cinnamon", "Canela"
    ],
    "PPD Mix": [
      "ppd mix","parafenilenodiamina","p-fenilenodiamina","p-phenylenediamine",
      "1,4-diaminobenzene","paradiaminobenzeno","antidegradante ippd","antidegradante 6ppd"
    ],
    "Nitrofurazona": [
      "nitrofurazona","furacin","nitrofural","aldomycin","amifur","chemfuran","coxistat",
      "furan-2","furacinetten","furaplast","furazol w","furesol furracoccid",
      "mammex","nefco","nifuzon","vabrocid"
    ]
  };

  function normalize(str){
    return (str||"").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function checkAllergens(ingredients){
    const found = [];
    const text = normalize(ingredients);
    for(const allergen in allergenList){
      for(const term of allergenList[allergen]){
        if(text.includes(normalize(term))){
          found.push(allergen + " ("+term+")");
          break;
        }
      }
    }
    return found;
  }

  async function fetchOpenProduct(barcode){
    const endpoints = [
      `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
    ];
    for(const url of endpoints){
      try{
        const res = await fetch(url);
        if(!res.ok) continue;
        const j = await res.json();
        if(j && (j.status === 1 || j.product)){
          return { product: j.product || j, url };
        }
      }catch(e){
        console.warn("Erro ao buscar:", e);
      }
    }
    return null;
  }

  document.getElementById("process").addEventListener("click", ()=>{
    const fileInput = document.getElementById("file");
    const f = fileInput.files[0];
    if(!f){ alert("Escolha uma imagem primeiro."); return; }

    document.getElementById("status").innerText = "Lendo código...";
    const reader = new FileReader();
    reader.onload = function(e){
      document.getElementById("imgPreview").src = e.target.result;

      Quagga.decodeSingle({
        src: e.target.result,
        locate: true,
        numOfWorkers: 0,
        inputStream: { size: 800 },
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "code_128_reader",
            "upc_reader",
            "upc_e_reader"
          ]
        }
      }, async function(result){
        if(result && result.codeResult){
          const code = result.codeResult.code;
          document.getElementById("status").innerText = "Código detectado: " + code;

          const data = await fetchOpenProduct(code);
          if(!data){
            document.getElementById("resultArea").innerHTML =
              `<div class="found">Produto não encontrado para o código ${code}.</div>`;
            return;
          }

          const product = data.product;
          const ingredients = product.ingredients_text || product.ingredients_text_en || "(não disponível)";
          const allergensFound = checkAllergens(ingredients);

          let html = `<div class="found">
            <strong>${product.product_name || "(sem nome)"}</strong><br/>
            Código: <em>${code}</em><br/>
            Fonte: <a href="${data.url}" target="_blank">${data.url}</a>
            <div style="margin-top:8px"><strong>Ingredientes:</strong><br/>${ingredients}</div>
          `;

          if(allergensFound.length){
            html += `<div class="alert"><strong>Atenção!</strong> Possíveis alergênicos encontrados: ${allergensFound.join(", ")}</div>`;
          } else {
            html += `<div style="margin-top:6px;color:green">Nenhum dos alergênicos da lista foi detectado.</div>`;
          }

          html += "</div>";
          document.getElementById("resultArea").innerHTML = html;
          document.getElementById("productJson").innerText = JSON.stringify(product, null, 2);
        } else {
          document.getElementById("status").innerText = "Não foi possível ler o código.";
        }
      });
    };
    reader.readAsDataURL(f);
  });
});